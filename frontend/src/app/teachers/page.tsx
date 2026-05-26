"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadRazorpay } from "../../lib/razorpay";
import { API_BASE_URL } from "../../lib/config";

export default function TeachersList() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search & Filter State
  const [subjectInput, setSubjectInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [minFeeInput, setMinFeeInput] = useState("");
  const [maxFeeInput, setMaxFeeInput] = useState("");

  // Modal selection state
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [submittingSelection, setSubmittingSelection] = useState(false);

  const fetchTeachers = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      // Build query string
      const params = new URLSearchParams();
      if (subjectInput) params.append("subject", subjectInput);
      if (locationInput) params.append("location", locationInput);
      if (minFeeInput) params.append("minFee", minFeeInput);
      if (maxFeeInput) params.append("maxFee", maxFeeInput);

      const res = await fetch(`${API_BASE_URL}/api/teachers?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
      } else {
        throw new Error("Failed to load teachers list");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeachers();
  };

  // Selection Procedure Option 1: Own Risk
  const handleSelectOwnRisk = async () => {
    if (!selectedTeacher) return;
    setSubmittingSelection(true);
    setError("");

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/api/parents/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          teacherId: selectedTeacher.id,
          paymentType: "OWN_RISK"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to make selection");

      setSuccess("Tutor selected successfully under Own Risk!");
      setSelectedTeacher(null);
      setTimeout(() => {
        router.push("/dashboard/parent");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingSelection(false);
    }
  };

  // Selection Procedure Option 2: Platform Pay
  const handleSelectPlatformPay = async () => {
    if (!selectedTeacher) return;
    setSubmittingSelection(true);
    setError("");

    const token = localStorage.getItem("token");

    const rzLoaded = await loadRazorpay();
    if (!rzLoaded) {
      setError("Failed to load payment gateway. Please check connection.");
      setSubmittingSelection(false);
      return;
    }

    try {
      // 1. Create a selection record as PLATFORM_PAY first (status is PENDING)
      const selectionRes = await fetch(`${API_BASE_URL}/api/parents/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          teacherId: selectedTeacher.id,
          paymentType: "PLATFORM_PAY"
        })
      });

      const selectionData = await selectionRes.json();
      if (!selectionRes.ok) throw new Error(selectionData.error || "Failed to make selection");
      
      const selectionId = selectionData.selection.id;

      // 2. Create Razorpay order for parent verification fee (₹299 platform security fee)
      const orderRes = await fetch(`${API_BASE_URL}/api/payments/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ amount: 299, purpose: "PLATFORM_PAY" })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to initiate payment");

      // 3. Open Razorpay Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.order.amount,
        currency: "INR",
        name: "Grow Infinity Platform",
        description: "Parent Verification & Safety Fee",
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            // Verify Payment (updates selection status to ACCEPTED)
            const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                purpose: "PLATFORM_PAY",
                metadata: { selectionId }
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed");

            setSuccess("Payment successful! tutor unlocked with platform insurance benefits.");
            setSelectedTeacher(null);
            setTimeout(() => {
              router.push("/dashboard/parent");
            }, 1500);
          } catch (err: any) {
            setError(err.message || "Payment verification failed");
          }
        },
        prefill: {
          name: "Parent User",
          email: JSON.parse(localStorage.getItem("user") || "{}").email || "",
        },
        theme: {
          color: "#2563eb" // blue color accent
        }
      };

      const rzPayment = new (window as any).Razorpay(options);
      rzPayment.open();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingSelection(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
          <Link href="/" className="inline-flex items-center space-x-2">
            <svg className="w-8 h-8 text-blue-600 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 12C10.7951 10.1537 9.2049 9 7.5 9c-2.4853 0-4.5 1.3431-4.5 3s2.0147 3 4.5 3c1.7049 0 3.2951-1.1537 4.5-3zm0 0c1.2049-1.1537 2.7951-2 4.5-2 2.4853 0 4.5 1.3431 4.5 3s-2.0147 3-4.5 3c-1.7049 0-3.2951-1.1537-4.5-3z" />
            </svg>
            <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Grow Infinity</span>
          </Link>
          <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase border border-slate-200">Parent Browser</span>
        </div>
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => router.push("/dashboard/parent")}
            className="text-slate-600 hover:text-blue-600 text-sm font-semibold transition"
          >
            My Dashboard
          </button>
          <button 
            onClick={() => { localStorage.removeItem("token"); router.push("/login"); }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 text-9xl font-black select-none pointer-events-none">GROW</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Find an Expert Tutor</h1>
          <p className="mt-2 text-blue-100 text-sm max-w-xl leading-relaxed">
            Browse through our verified educators. Select a tutor and choose either own-risk mode or platform payment insurance for maximum safety features.
          </p>
        </div>

        {/* Filters Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Subject</label>
              <input 
                type="text" 
                placeholder="e.g. Math, Physics" 
                value={subjectInput} 
                onChange={(e) => setSubjectInput(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Location</label>
              <input 
                type="text" 
                placeholder="e.g. Delhi, Mumbai" 
                value={locationInput} 
                onChange={(e) => setLocationInput(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Min Hourly Fee</label>
              <input 
                type="number" 
                placeholder="Min INR" 
                value={minFeeInput} 
                onChange={(e) => setMinFeeInput(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Max Hourly Fee</label>
              <input 
                type="number" 
                placeholder="Max INR" 
                value={maxFeeInput} 
                onChange={(e) => setMaxFeeInput(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div className="flex items-end">
              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                🔍 Search Tutors
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl mb-8 text-sm">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-4 rounded-2xl mb-8 text-sm font-semibold">
            🎉 {success}
          </div>
        )}

        {/* Tutors Listing Grid */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xs">Fetching tutors...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teachers.map((t) => (
              <div key={t.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-lg transition duration-300">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{t.fullName}</h3>
                      <p className="text-xs text-blue-600 font-bold mt-0.5">{t.subjects.join(", ")}</p>
                    </div>
                    <span className="bg-blue-50 text-blue-600 font-bold text-xs px-2.5 py-1 rounded-full border border-blue-100">
                      ⭐ {t.rating > 0 ? t.rating.toFixed(1) : "N/A"}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 mb-6 border-b border-slate-100 pb-4">
                    <p className="flex items-center"><span className="text-slate-400 font-bold w-20">📍 Location:</span> {t.location}</p>
                    <p className="flex items-center"><span className="text-slate-400 font-bold w-20">🎓 Experience:</span> {t.experience} Years</p>
                    <p className="flex items-center"><span className="text-slate-400 font-bold w-20">💰 Hourly Fee:</span> ₹{t.hourlyFee} / Hour</p>
                  </div>

                  {t.demoLectureUrl && (
                    <div className="mb-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Sample Video Lecture</p>
                      {t.demoLectureUrl.startsWith("http") ? (
                        <a 
                          href={t.demoLectureUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center space-x-2 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-xs font-semibold hover:bg-slate-800 transition"
                        >
                          <span>▶ Play Demo Lecture</span>
                        </a>
                      ) : (
                        <p className="text-xs text-slate-500">File uploaded on disk (access on server)</p>
                      )}
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedTeacher(t)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-bold shadow-md hover:-translate-y-0.5 transition active:scale-95 cursor-pointer"
                >
                  🤝 Select Tutor
                </button>
              </div>
            ))}

            {teachers.length === 0 && (
              <div className="col-span-full text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-3xl">
                <span className="text-5xl block mb-2">🔍</span>
                <p className="font-semibold">No teachers found</p>
                <p className="text-xs mt-1">Try modifying your filters to search for other tutors.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SELECTION MODAL */}
      {selectedTeacher && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Select Tutor: {selectedTeacher.fullName}</h3>
                <p className="text-xs text-slate-400 mt-1">Please select your preferred platform connection procedure.</p>
              </div>
              <button 
                onClick={() => setSelectedTeacher(null)} 
                className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              
              {/* Option 1: Own Risk */}
              <div className="border border-slate-200 bg-slate-50 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-350 transition shadow-sm">
                <div>
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-lg font-bold mb-4">⚠️</div>
                  <h4 className="font-bold text-base text-slate-800">1. Take Faculties at Own Risk</h4>
                  <ul className="text-xs text-slate-500 mt-3 space-y-2 leading-relaxed">
                    <li className="flex items-start"><span className="text-amber-500 mr-1.5">•</span> Free platform selection</li>
                    <li className="flex items-start"><span className="text-amber-500 mr-1.5">•</span> Zero mediation by Grow Infinity</li>
                    <li className="flex items-start"><span className="text-amber-500 mr-1.5">•</span> No replacement guarantee</li>
                    <li className="flex items-start"><span className="text-amber-500 mr-1.5">•</span> Parent is solely responsible for disputes</li>
                  </ul>
                </div>
                <button
                  disabled={submittingSelection}
                  onClick={handleSelectOwnRisk}
                  className="mt-8 w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-xl text-xs active:scale-95 transition"
                >
                  Choose Own Risk
                </button>
              </div>

              {/* Option 2: Platform Pay */}
              <div className="border border-blue-200 bg-blue-50/50 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-300 transition shadow-sm">
                <div>
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-lg font-bold mb-4">🛡️</div>
                  <h4 className="font-bold text-base text-slate-800">2. Select Payment Procedure via Application</h4>
                  <ul className="text-xs text-slate-600 mt-3 space-y-2 leading-relaxed">
                    <li className="flex items-start"><span className="text-blue-500 mr-1.5">•</span> Pay small platform safety fee (₹299)</li>
                    <li className="flex items-start"><span className="text-blue-500 mr-1.5">•</span> 100% verified credentials guarantee</li>
                    <li className="flex items-start"><span className="text-blue-500 mr-1.5">•</span> Free tutor replacement in 30 days</li>
                    <li className="flex items-start"><span className="text-blue-500 mr-1.5">•</span> Dispute resolution & active chat monitoring</li>
                  </ul>
                </div>
                <button
                  disabled={submittingSelection}
                  onClick={handleSelectPlatformPay}
                  className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-blue-600/10 active:scale-95 transition"
                >
                  Pay ₹299 (Secure Platform)
                </button>
              </div>

            </div>

            {submittingSelection && (
              <p className="text-center text-slate-500 text-xs mt-6 animate-pulse">Processing selection request...</p>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadRazorpay } from "../../../lib/razorpay";
import ChatDrawer from "../../../components/ChatDrawer";

export default function ParentDashboard() {
  const router = useRouter();
  const [selections, setSelections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Chat state
  const [chattingWith, setChattingWith] = useState<any | null>(null);

  const fetchDashboardData = async () => {
    setError("");
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      // Get parent selections
      const res = await fetch("http://localhost:5000/api/parents/selections", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.status === 400) {
        // complete profile setup first
        router.push("/dashboard/parent/setup");
        return;
      }
      if (!res.ok) throw new Error("Failed to load dashboard data");
      
      const data = await res.json();
      setSelections(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load dashboard selections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Retry payment for a pending PLATFORM_PAY selection
  const handleRetryPayment = async (selectionId: string, teacher: any) => {
    setError("");
    setSuccess("");
    const token = localStorage.getItem("token");

    const rzLoaded = await loadRazorpay();
    if (!rzLoaded) {
      setError("Failed to load payment gateway SDK. Please check connection.");
      return;
    }

    try {
      // Create Razorpay order for platform security fee (₹299)
      const orderRes = await fetch("http://localhost:5000/api/payments/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ amount: 299, purpose: "PLATFORM_PAY" })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to initiate payment order");

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
            const verifyRes = await fetch("http://localhost:5000/api/payments/verify", {
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

            setSuccess("Payment successful! Tutor unlocked.");
            fetchDashboardData();
          } catch (err: any) {
            setError(err.message || "Payment verification failed");
          }
        },
        prefill: {
          name: "Parent User",
          email: JSON.parse(localStorage.getItem("user") || "{}").email || "",
        },
        theme: {
          color: "#2563eb"
        }
      };

      const rzPayment = new (window as any).Razorpay(options);
      rzPayment.open();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-slate-500 font-medium">Loading parent dashboard...</p>
      </div>
    );
  }

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
          <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase border border-slate-200">Parent Dashboard</span>
        </div>
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => router.push("/teachers")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md active:scale-95 transition"
          >
            🔍 Find More Tutors
          </button>
          <button 
            onClick={handleLogout}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {/* Banner info */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">My Selection Statuses</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage your tuition selections and open active chat channels with your teachers.</p>
          </div>
          <span className="bg-blue-50 text-blue-600 border border-blue-100 px-3.5 py-1 rounded-xl text-xs font-bold">
            {selections.length} Selected
          </span>
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

        {/* Selected Tutors Grid */}
        <div className="space-y-6">
          {selections.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <span className="text-5xl block mb-4">📭</span>
              <p className="font-semibold">No selections found</p>
              <p className="text-xs mt-1">Start by browsing verified tutors to send them tuition inquiry requests.</p>
              <button 
                onClick={() => router.push("/teachers")}
                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition active:scale-95"
              >
                Browse Tutors Now
              </button>
            </div>
          ) : (
            selections.map((sel) => {
              const hasAccepted = sel.status === "ACCEPTED";
              const isPlatformPay = sel.paymentType === "PLATFORM_PAY";

              return (
                <div key={sel.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition">
                  
                  {/* Left Side: Teacher Profile Summary */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-bold text-slate-800">{sel.teacher.fullName}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        hasAccepted 
                          ? "bg-emerald-50 border border-emerald-100 text-emerald-600" 
                          : "bg-amber-50 border border-amber-100 text-amber-600"
                      }`}>
                        ● {sel.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1">
                      <p><span className="font-semibold">Subjects:</span> {sel.teacher.subjects.map((s: any) => s.subject.name).join(", ")}</p>
                      <p><span className="font-semibold">Experience:</span> {sel.teacher.experience} Years</p>
                      <p><span className="font-semibold">Mode:</span> {sel.teacher.teachingMode?.join(", ") || "Online"}</p>
                      <p>
                        <span className="font-semibold">Connection Policy:</span>{" "}
                        <span className={`font-bold ${isPlatformPay ? "text-indigo-600" : "text-amber-600"}`}>
                          {isPlatformPay ? "🛡️ Application Insured" : "⚠️ Own Risk selection"}
                        </span>
                      </p>
                    </div>

                    {/* Show contact details if accepted */}
                    {hasAccepted && (
                      <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                        <p>📞 Phone: {sel.teacher.user.phoneNo || "N/A"}</p>
                        <p>✉️ Email: {sel.teacher.user.email}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Action Trigger */}
                  <div className="flex items-center">
                    {hasAccepted ? (
                      <button 
                        onClick={() => setChattingWith({ id: sel.teacher.user.id, name: sel.teacher.fullName })}
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md active:scale-95 transition-all"
                      >
                        💬 Chat Box
                      </button>
                    ) : (
                      <div className="w-full md:w-auto flex flex-col md:items-end gap-2">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Awaiting Verification Fee</p>
                        <button 
                          onClick={() => handleRetryPayment(sel.id, sel.teacher)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg active:scale-95 transition"
                        >
                          Retry Payment (₹299)
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Chat Box Drawer */}
      {chattingWith && (
        <ChatDrawer 
          receiverId={chattingWith.id}
          receiverName={chattingWith.name}
          onClose={() => setChattingWith(null)}
        />
      )}
    </div>
  );
}

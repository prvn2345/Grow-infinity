"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadRazorpay } from "../../../lib/razorpay";
import { API_BASE_URL } from "../../../lib/config";
import ChatDrawer from "../../../components/ChatDrawer";

export default function TeacherDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [selectionsData, setSelectionsData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Upload and demo lecture state
  const [demoUrl, setDemoUrl] = useState("");
  const [uploadingDemo, setUploadingDemo] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  // Chat State
  const [chattingWith, setChattingWith] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msgSuccess, setMsgSuccess] = useState("");

  const fetchData = async () => {
    setError("");
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const headers = { "Authorization": `Bearer ${token}` };
      
      // Fire all three requests in parallel
      const [profileRes, selectionsRes, notifRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/teachers/profile`, { headers }),
        fetch(`${API_BASE_URL}/api/teachers/selections`, { headers }),
        fetch(`${API_BASE_URL}/api/notifications`, { headers })
      ]);

      if (profileRes.status === 404) {
        // Redirection to profile setup
        router.push("/dashboard/teacher/setup");
        return;
      }
      if (!profileRes.ok) throw new Error("Failed to load profile");
      const profileData = await profileRes.json();
      setProfile(profileData);
      if (profileData.demoLectureUrl) {
        setDemoUrl(profileData.demoLectureUrl);
      }

      if (selectionsRes.ok) {
        const selData = await selectionsRes.json();
        setSelectionsData(selData);
      }

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Mark notification as read
  const handleMarkNotificationRead = async (id: string) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  // Upload/Submit demo lecture
  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingDemo(true);
    setError("");
    setMsgSuccess("");

    const token = localStorage.getItem("token");
    const formData = new FormData();
    if (fileToUpload) {
      formData.append("demoLecture", fileToUpload);
    } else if (demoUrl) {
      formData.append("demoLectureUrl", demoUrl);
    } else {
      setError("Please select a file or provide a video URL");
      setUploadingDemo(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/teachers/demo-lecture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload demo lecture");

      setMsgSuccess("Demo lecture saved successfully!");
      setFileToUpload(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingDemo(false);
    }
  };

  // Razorpay payment for Teacher Subscription
  const handlePaySubscription = async () => {
    setError("");
    setMsgSuccess("");
    const token = localStorage.getItem("token");

    const rzLoaded = await loadRazorpay();
    if (!rzLoaded) {
      setError("Failed to load payment gateway SDK. Please check connection.");
      return;
    }

    try {
      // Create Razorpay Order in Backend
      const orderRes = await fetch(`${API_BASE_URL}/api/payments/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ amount: 499, purpose: "TEACHER_SUBSCRIPTION" })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to initiate payment");

      const options = {
        key: orderData.keyId,
        amount: orderData.order.amount,
        currency: "INR",
        name: "Grow Infinity Platform",
        description: "Teacher Premium Subscription",
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            // Verify Payment
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
                purpose: "TEACHER_SUBSCRIPTION"
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed");

            setMsgSuccess("Subscription activated successfully!");
            fetchData();
          } catch (err: any) {
            setError(err.message || "Payment verification failed");
          }
        },
        prefill: {
          name: profile?.fullName || "",
          email: JSON.parse(localStorage.getItem("user") || "{}").email || "",
        },
        theme: {
          color: "#ea580c" // orange color accent
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <svg className="animate-spin h-10 w-10 text-orange-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-slate-400 font-medium">Loading teacher dashboard...</p>
      </div>
    );
  }

  const hasSubscription = selectionsData?.checklist?.hasSubscription;
  const hasDemoLecture = selectionsData?.checklist?.hasDemoLecture;
  const isUnlocked = selectionsData?.unlocked;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      {/* Navbar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-3 md:px-6 md:py-4 flex justify-between items-center shadow-lg w-full">
        <div className="flex items-center space-x-1.5 md:space-x-2 min-w-0">
          <Link href="/" className="inline-flex items-center space-x-1.5 md:space-x-2 min-w-0">
            <svg className="w-6 h-6 md:w-8 md:h-8 text-orange-500 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 12C10.7951 10.1537 9.2049 9 7.5 9c-2.4853 0-4.5 1.3431-4.5 3s2.0147 3 4.5 3c1.7049 0 3.2951-1.1537 4.5-3zm0 0c1.2049-1.1537 2.7951-2 4.5-2 2.4853 0 4.5 1.3431 4.5 3s-2.0147 3-4.5 3c-1.7049 0-3.2951-1.1537-4.5-3z" />
            </svg>
            <span className="text-lg md:text-2xl font-black bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent truncate">Grow Infinity</span>
          </Link>
          <span className="hidden sm:inline-block bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border border-slate-700 flex-shrink-0">Teacher Panel</span>
        </div>
        <div className="flex items-center space-x-2 md:space-x-6 flex-shrink-0">
          <span className="text-slate-300 font-semibold text-xs md:text-sm hidden md:inline truncate max-w-[150px]">Welcome, {profile?.fullName}</span>
          <button 
            onClick={handleLogout}
            className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold transition flex-shrink-0 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: STATS & FORMALITIES CHECKLIST */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Status & Notifications Panel */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">📋</span> Checklist Status
            </h2>
            
            <div className="space-y-4">
              {/* Check 1: Paid Subscription */}
              <div className="flex items-start justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800/80">
                <div>
                  <h3 className="font-bold text-sm">Premium Subscription</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Pay subscription to unlock student inquiries.</p>
                </div>
                {hasSubscription ? (
                  <span className="bg-emerald-950 border border-emerald-900 text-emerald-400 font-bold text-xs px-3 py-1 rounded-full flex items-center">
                    ✓ Paid
                  </span>
                ) : (
                  <button 
                    onClick={handlePaySubscription}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-lg shadow-orange-600/20 active:scale-95 transition"
                  >
                    Pay ₹499
                  </button>
                )}
              </div>

              {/* Check 2: Demo Video Uploaded */}
              <div className="flex items-start justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800/80">
                <div>
                  <h3 className="font-bold text-sm">Demo Lecture</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Upload a sample lecture for parents.</p>
                </div>
                {hasDemoLecture ? (
                  <span className="bg-emerald-950 border border-emerald-900 text-emerald-400 font-bold text-xs px-3 py-1 rounded-full flex items-center">
                    ✓ Uploaded
                  </span>
                ) : (
                  <span className="bg-red-950 border border-red-900 text-red-400 font-bold text-xs px-3 py-1 rounded-full">
                    ✕ Missing
                  </span>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-950/50 border border-red-900 text-red-400 p-3.5 rounded-2xl text-xs">
                ⚠️ {error}
              </div>
            )}
            {msgSuccess && (
              <div className="mt-4 bg-emerald-950/50 border border-emerald-900 text-emerald-400 p-3.5 rounded-2xl text-xs font-medium">
                🎉 {msgSuccess}
              </div>
            )}
          </div>

          {/* Video upload form */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">🎥</span> Update Demo Lecture
            </h2>
            <form onSubmit={handleDemoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Method A: Upload Video File</label>
                <input 
                  type="file" 
                  accept="video/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFileToUpload(e.target.files[0]);
                      setDemoUrl(""); // clear link if uploading file
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-850 file:text-orange-500 hover:file:bg-slate-800"
                />
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-xs font-bold uppercase tracking-wider">OR</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Method B: Paste Video URL</label>
                <input 
                  type="text" 
                  placeholder="e.g. https://youtube.com/embed/... or Vimeo link"
                  value={demoUrl}
                  onChange={(e) => {
                    setDemoUrl(e.target.value);
                    setFileToUpload(null); // clear file if entering link
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 placeholder:text-slate-600 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={uploadingDemo}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white py-3 rounded-xl font-bold text-xs shadow-lg active:scale-95 disabled:opacity-50 transition-all"
              >
                {uploadingDemo ? "Saving..." : "Save Demo Lecture"}
              </button>
            </form>
          </div>

          {/* Notifications List */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl max-h-[300px] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">🔔</span> Notifications
            </h2>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-4">No notifications yet.</p>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    onClick={() => !notif.isRead && handleMarkNotificationRead(notif.id)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition ${
                      notif.isRead 
                        ? "bg-slate-950/40 border-slate-800/40 text-slate-500" 
                        : "bg-slate-950 border-orange-500/30 text-slate-200 hover:border-orange-500/50"
                    }`}
                  >
                    <p className="leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-slate-600 mt-2 block">
                      {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: INQUIRIES LIST (LOCKED / UNLOCKED) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
            
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Tuition Inquiries</h2>
                <p className="text-xs text-slate-400 mt-1">Parents who have selected you for home tutoring inquiries.</p>
              </div>
              <span className="bg-slate-850 border border-slate-800 px-3 py-1 rounded-xl text-xs font-bold text-orange-500">
                {selectionsData?.selections?.length || 0} Total
              </span>
            </div>

            {/* Locked Padlock Banner Overlay if incomplete */}
            {!isUnlocked && selectionsData?.selections && selectionsData.selections.length > 0 && (
              <div className="bg-orange-950/30 border border-orange-900/60 rounded-3xl p-5 mb-6 flex items-start space-x-4 animate-pulse">
                <span className="text-3xl text-orange-500">🔒</span>
                <div>
                  <h4 className="font-bold text-sm text-orange-400">Lock Verification Required</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    You have active parent requests! Complete your checklist by **paying the platform subscription (₹499)** and **uploading a demo lecture** video to unlock their contact information and chat window.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {selectionsData?.selections?.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <span className="text-5xl block mb-4">📭</span>
                  <p className="font-semibold text-slate-400">No inquiries yet</p>
                  <p className="text-xs text-slate-500 mt-1">When parents select you, they will appear here.</p>
                </div>
              ) : (
                selectionsData?.selections?.map((sel: any) => (
                  <div 
                    key={sel.id} 
                    className={`bg-slate-950 border rounded-3xl p-6 transition-all duration-300 relative ${
                      isUnlocked 
                        ? "border-slate-800 hover:border-slate-700 hover:shadow-xl" 
                        : "border-slate-900 opacity-90 select-none filter blur-[0.3px]"
                    }`}
                  >
                    {/* Locked Lock Icon Badge */}
                    {!isUnlocked && (
                      <div className="absolute top-6 right-6 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full flex items-center text-slate-500 font-bold text-xs">
                        <span className="mr-1">🔒</span> Locked Profile
                      </div>
                    )}

                    {isUnlocked && (
                      <div className="absolute top-6 right-6 flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          sel.paymentType === "PLATFORM_PAY" 
                            ? "bg-indigo-950 border border-indigo-900 text-indigo-400" 
                            : "bg-amber-950 border border-amber-900 text-amber-500"
                        }`}>
                          {sel.paymentType === "PLATFORM_PAY" ? "🛡️ Platform Verified" : "⚠️ Own Risk Selection"}
                        </span>
                      </div>
                    )}

                    {/* Inquiry Info Card */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-200">{sel.parent.fullName}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Tutoring request for child</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-850/50">
                        <div className="text-xs space-y-2">
                          <p><span className="text-slate-500 font-bold">Child Name:</span> <span className={!isUnlocked ? "bg-slate-800 text-transparent select-none rounded px-2" : "text-slate-300 font-medium"}>{sel.parent.childName}</span></p>
                          <p><span className="text-slate-500 font-bold">Grade Level:</span> <span className="text-slate-300 font-medium">{sel.parent.childClass}</span></p>
                          <p><span className="text-slate-500 font-bold">Teaching Mode:</span> <span className="text-slate-300 font-medium">{sel.parent.teachingMode?.join(", ") || "Any"}</span></p>
                        </div>
                        <div className="text-xs space-y-2">
                          <p><span className="text-slate-500 font-bold">Preferred Time:</span> <span className="text-slate-300 font-medium">{sel.parent.preferredTiming}</span></p>
                          <p><span className="text-slate-500 font-bold">Monthly Budget:</span> <span className={!isUnlocked ? "bg-slate-800 text-transparent select-none rounded px-2" : "text-slate-300 font-medium"}>{sel.parent.budget ? `₹${sel.parent.budget}` : "Locked"}</span></p>
                          <p><span className="text-slate-500 font-bold">Preferred Location:</span> <span className={!isUnlocked ? "bg-slate-800 text-transparent select-none rounded px-2" : "text-slate-300 font-medium"}>{sel.parent.location}</span></p>
                        </div>
                      </div>

                      {/* Contacts & Chat Box */}
                      {isUnlocked ? (
                        <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between border-t border-slate-900 mt-4 gap-4">
                          <div className="text-xs space-y-1">
                            <p className="flex items-center text-slate-400">
                              <span className="mr-1.5">📞</span> {sel.parent.phoneNo}
                            </p>
                            <p className="flex items-center text-slate-400">
                              <span className="mr-1.5">✉️</span> {sel.parent.email}
                            </p>
                          </div>
                          <button 
                            onClick={() => setChattingWith({ id: sel.parent.userId, name: sel.parent.fullName })}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/10 hover:-translate-y-0.5 active:scale-95 transition-all"
                          >
                            💬 Start Chat Box
                          </button>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-900/60 mt-4 flex items-center justify-between">
                          <div className="text-xs space-y-1 text-slate-600">
                            <p>📞 Phone: Locked</p>
                            <p>✉️ Email: Locked</p>
                          </div>
                          <button 
                            disabled 
                            className="bg-slate-800 text-slate-500 font-bold text-xs px-5 py-2.5 rounded-xl cursor-not-allowed border border-slate-700"
                          >
                            💬 Chat Locked
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
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

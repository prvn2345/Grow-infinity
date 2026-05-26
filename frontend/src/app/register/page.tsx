"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();

  // Navigation State
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<"PARENT" | "TEACHER" | "">("");

  // Common Form State
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Specific Form State
  const [childName, setChildName] = useState(""); // Parent
  const [qualifications, setQualifications] = useState(""); // Teacher
  
  // Group & Sub-Group Selection
  const [group, setGroup] = useState("");
  const [subGroup, setSubGroup] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Submission State
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getSubjectsForGroup = (g: string) => {
    switch (g) {
      case "grp-1": return ["All Subjects", "English", "Math"];
      case "grp-2": return ["English", "Math", "Science", "Social Studies"];
      case "grp-3": return ["Math", "Physics", "Chemistry", "Biology", "English", "Social Science"];
      case "grp-4": return ["Physics", "Chemistry", "Math", "Biology", "Computer Science", "English"];
      case "grp-5": return ["Art", "Dance", "Music", "Coding"];
      default: return [];
    }
  };

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: any = { email, username, password, phoneNo, role };
      
      if (role === "PARENT") {
        payload.parentDetails = { fullName, childName, group, subGroup };
      } else if (role === "TEACHER") {
        payload.teacherDetails = { fullName, group, qualifications, subjects: selectedSubjects };
      }

      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      const loginRes = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      
      localStorage.setItem("token", loginData.token);
      localStorage.setItem("user", JSON.stringify(loginData.user));

      if (role === "TEACHER") router.push("/dashboard/teacher/setup");
      else router.push("/teachers"); 
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderParentSubGroupOptions = () => {
    if (group === "grp-3") {
      return (
        <select value={subGroup} onChange={(e) => setSubGroup(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" required>
          <option value="">Select Specifics</option>
          <option value="boards">Boards Only</option>
          <option value="boards+foundation">Boards + Foundation</option>
        </select>
      );
    }
    if (group === "grp-4") {
      return (
        <select value={subGroup} onChange={(e) => setSubGroup(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" required>
          <option value="">Select Specifics</option>
          <option value="boards">Boards Only</option>
          <option value="boards+iit-jee-neet">Boards + IIT JEE / NEET</option>
        </select>
      );
    }
    if (group === "grp-5") {
      return (
        <select value={subGroup} onChange={(e) => setSubGroup(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" required>
          <option value="">Select Activity</option>
          <option value="art">Art</option>
          <option value="dance">Dance</option>
          <option value="music">Music</option>
        </select>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full">
        
        {/* Header */}
        <div className="text-center mb-10 flex flex-col items-center justify-center">
          <Link href="/" className="inline-flex items-center space-x-2 text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
            <svg className="w-10 h-10 text-blue-600 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 12C10.7951 10.1537 9.2049 9 7.5 9c-2.4853 0-4.5 1.3431-4.5 3s2.0147 3 4.5 3c1.7049 0 3.2951-1.1537 4.5-3zm0 0c1.2049-1.1537 2.7951-2 4.5-2 2.4853 0 4.5 1.3431 4.5 3s-2.0147 3-4.5 3c-1.7049 0-3.2951-1.1537-4.5-3z" />
            </svg>
            <span>Grow Infinity</span>
          </Link>
          <p className="mt-3 text-slate-500 font-medium">Join our community of elite educators and ambitious students.</p>
        </div>

        {/* STEP 1: ROLE SELECTION */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-8">How would you like to join us?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Parent Card */}
              <div 
                onClick={() => { setRole("PARENT"); setStep(2); }}
                className="group cursor-pointer bg-white rounded-3xl p-8 border-2 border-transparent hover:border-blue-500 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center shadow-lg"
              >
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-4xl">👨‍👩‍👦</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">I am a Parent</h3>
                <p className="text-slate-500 font-medium">I am looking for a qualified home tutor for my child's bright future.</p>
                <div className="mt-8 text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                  Continue as Parent <span className="ml-2">→</span>
                </div>
              </div>

              {/* Teacher Card */}
              <div 
                onClick={() => { setRole("TEACHER"); setStep(2); }}
                className="group cursor-pointer bg-white rounded-3xl p-8 border-2 border-transparent hover:border-indigo-500 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center shadow-lg"
              >
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-4xl">👨‍🏫</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">I am a Teacher</h3>
                <p className="text-slate-500 font-medium">I want to teach students, manage classes, and grow my career.</p>
                <div className="mt-8 text-indigo-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                  Continue as Teacher <span className="ml-2">→</span>
                </div>
              </div>

            </div>
            <div className="mt-8 text-center">
              <Link href="/login" className="text-slate-500 hover:text-blue-600 font-medium transition-colors">
                Already have an account? Sign in here.
              </Link>
            </div>
          </div>
        )}

        {/* STEP 2: REGISTRATION FORM */}
        {step === 2 && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12 animate-in fade-in slide-in-from-right-8 duration-500 relative">
            <button 
              onClick={() => { setStep(1); setGroup(""); setSelectedSubjects([]); setSubGroup(""); }}
              className="absolute top-8 left-8 text-slate-400 hover:text-slate-600 font-medium flex items-center transition-colors"
            >
              ← Back
            </button>
            
            <div className="text-center mb-10 mt-6 md:mt-0">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                {role === "PARENT" ? "Parent Registration" : "Teacher Registration"}
              </h2>
              <p className="text-slate-500">Fill in the details below to create your account.</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-8">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center font-medium">
                  <span className="mr-2">⚠️</span> {error}
                </div>
              )}

              {/* Account Details Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Email Address</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="hello@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Username</label>
                    <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="e.g. jdoe99" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Password</label>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Phone Number</label>
                    <input type="tel" required value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="+91 9876543210" />
                  </div>
                </div>
              </div>

              {/* Personal Details Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Your Full Name</label>
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="John Doe" />
                  </div>

                  {role === "PARENT" && (
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Son/Daughter's Name</label>
                      <input type="text" required value={childName} onChange={(e) => setChildName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="Alex Doe" />
                    </div>
                  )}

                  {role === "TEACHER" && (
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Qualifications</label>
                      <input type="text" required value={qualifications} onChange={(e) => setQualifications(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="e.g. M.Sc Mathematics, B.Ed" />
                    </div>
                  )}
                </div>
              </div>

              {/* Preferences Section */}
              <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800">Academic Preferences</h3>
                
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">
                    {role === "PARENT" ? "Which group does your child belong to?" : "Which group do you prefer teaching?"}
                  </label>
                  <select
                    value={group}
                    onChange={(e) => {
                      setGroup(e.target.value);
                      setSubGroup(""); 
                      setSelectedSubjects([]);
                    }}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                    required
                  >
                    <option value="">Select a Group...</option>
                    <option value="grp-1">Group 1 (Pre-school)</option>
                    <option value="grp-2">Group 2 (Class 1-7)</option>
                    <option value="grp-3">Group 3 (Class 8-10)</option>
                    <option value="grp-4">Group 4 (Class 11-12)</option>
                    <option value="grp-5">Group 5 (Co-curricular activities)</option>
                  </select>
                </div>

                {role === "PARENT" && group && (group === "grp-3" || group === "grp-4" || group === "grp-5") && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-bold text-slate-600 mb-2">Specific Requirement</label>
                    {renderParentSubGroupOptions()}
                  </div>
                )}

                {role === "TEACHER" && group && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-bold text-slate-600 mb-3">Select Subjects</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {getSubjectsForGroup(group).map((sub) => (
                        <label key={sub} className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group-label">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(sub)}
                            onChange={() => handleSubjectToggle(sub)}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors"
                          />
                          <span className="text-sm font-medium text-slate-700">{sub}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-4 px-8 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transform hover:-translate-y-1 transition-all duration-300"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Setting up account...
                    </span>
                  ) : (
                    "Complete Registration"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../lib/config";

export default function Home() {
  const router = useRouter();

  // Navigation State
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<"PARENT" | "TEACHER" | "">("");
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

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

  const validateStep = (s: number): boolean => {
    setError("");
    if (s === 1) {
      if (!email || !username || !password || !phoneNo) {
        setError("All account details are required.");
        return false;
      }
      if (!email.includes("@")) {
        setError("Please enter a valid email address.");
        return false;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return false;
      }
    } else if (s === 2) {
      if (!fullName) {
        setError("Please enter your full name.");
        return false;
      }
      if (role === "PARENT" && !childName) {
        setError("Please enter your child's name.");
        return false;
      }
      if (role === "TEACHER" && !qualifications) {
        setError("Please enter your qualifications.");
        return false;
      }
    } else if (s === 3) {
      if (!group) {
        setError("Please select academic group preference.");
        return false;
      }
      if (role === "PARENT" && (group === "grp-3" || group === "grp-4" || group === "grp-5") && !subGroup) {
        setError("Please select specific requirement specifics.");
        return false;
      }
      if (role === "TEACHER" && selectedSubjects.length === 0) {
        setError("Please select at least one subject.");
        return false;
      }
    }
    return true;
  };

  const handleFormNext = () => {
    if (validateStep(formStep)) {
      setFormStep(prev => (prev + 1) as any);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formStep < 3) {
      handleFormNext();
      return;
    }
    if (!validateStep(3)) return;

    setLoading(true);
    setError("");

    try {
      const payload: any = { email, username, password, phoneNo, role };
      
      if (role === "PARENT") {
        payload.parentDetails = { fullName, childName, group, subGroup };
      } else if (role === "TEACHER") {
        payload.teacherDetails = { fullName, group, qualifications, subjects: selectedSubjects };
      }

      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
        <select value={subGroup} onChange={(e) => setSubGroup(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm" required>
          <option value="">Select Specifics</option>
          <option value="boards">Boards Only</option>
          <option value="boards+foundation">Boards + Foundation</option>
        </select>
      );
    }
    if (group === "grp-4") {
      return (
        <select value={subGroup} onChange={(e) => setSubGroup(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm" required>
          <option value="">Select Specifics</option>
          <option value="boards">Boards Only</option>
          <option value="boards+iit-jee-neet">Boards + IIT JEE / NEET</option>
        </select>
      );
    }
    if (group === "grp-5") {
      return (
        <select value={subGroup} onChange={(e) => setSubGroup(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm" required>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-orange-500 flex items-center justify-center p-4 md:p-6 font-sans">
      <div className="max-w-4xl w-full">
        
        {/* Header */}
        <div className="text-center mb-6 md:mb-10 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <svg className="w-8 h-8 md:w-12 md:h-12 text-orange-500 animate-pulse drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 12C10.7951 10.1537 9.2049 9 7.5 9c-2.4853 0-4.5 1.3431-4.5 3s2.0147 3 4.5 3c1.7049 0 3.2951-1.1537 4.5-3zm0 0c1.2049-1.1537 2.7951-2 4.5-2 2.4853 0 4.5 1.3431 4.5 3s-2.0147 3-4.5 3c-1.7049 0-3.2951-1.1537-4.5-3z" />
            </svg>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
              Grow Infinity
            </h1>
          </div>
          <p className="mt-2 text-blue-100 font-medium text-xs md:text-sm drop-shadow-sm">Join our community of elite educators and ambitious students.</p>
        </div>

        {/* STEP 1: ROLE SELECTION */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <h2 className="text-lg md:text-2xl font-bold text-center text-white mb-6 md:mb-10 drop-shadow-md">How would you like to join us?</h2>
            
            {/* 2 Cards side-by-side on all screens */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Parent Card */}
              <div 
                onClick={() => { setRole("PARENT"); setStep(2); setFormStep(1); }}
                className="group cursor-pointer bg-white/10 backdrop-blur-md rounded-3xl p-4 md:p-8 border border-white/20 hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center shadow-xl"
              >
                <div className="w-14 h-14 md:w-24 md:h-24 bg-white/20 group-hover:bg-blue-50 rounded-full flex items-center justify-center mb-3 md:mb-6 group-hover:scale-110 transition-all duration-300">
                  <span className="text-2xl md:text-4xl drop-shadow-md">👨‍👩‍👦</span>
                </div>
                <h3 className="text-sm md:text-2xl font-bold text-white group-hover:text-slate-800 mb-1.5 md:mb-3 transition-colors">I am a Parent</h3>
                <p className="hidden md:block text-blue-100 group-hover:text-slate-500 font-medium transition-colors text-sm leading-relaxed">I am looking for a qualified home tutor for my child's bright future.</p>
                <div className="hidden md:flex mt-8 text-orange-400 group-hover:text-orange-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity items-center text-sm">
                  Continue <span className="ml-2">→</span>
                </div>
              </div>

              {/* Teacher Card */}
              <div 
                onClick={() => { setRole("TEACHER"); setStep(2); setFormStep(1); }}
                className="group cursor-pointer bg-white/10 backdrop-blur-md rounded-3xl p-4 md:p-8 border border-white/20 hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center shadow-xl"
              >
                <div className="w-14 h-14 md:w-24 md:h-24 bg-white/20 group-hover:bg-orange-50 rounded-full flex items-center justify-center mb-3 md:mb-6 group-hover:scale-110 transition-all duration-300">
                  <span className="text-2xl md:text-4xl drop-shadow-md">👨‍🏫</span>
                </div>
                <h3 className="text-sm md:text-2xl font-bold text-white group-hover:text-slate-800 mb-1.5 md:mb-3 transition-colors">I am a Teacher</h3>
                <p className="hidden md:block text-blue-100 group-hover:text-slate-500 font-medium transition-colors text-sm leading-relaxed">I want to teach students, manage classes, and grow my career.</p>
                <div className="hidden md:flex mt-8 text-orange-400 group-hover:text-orange-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity items-center text-sm">
                  Continue <span className="ml-2">→</span>
                </div>
              </div>

            </div>

            <div className="mt-8 text-center">
              <Link href="/login" className="text-blue-100 hover:text-white font-semibold transition-colors underline decoration-blue-300 underline-offset-4 text-sm">
                Already have an account? Sign in here.
              </Link>
            </div>
          </div>
        )}

        {/* STEP 2: REGISTRATION FORM */}
        {step === 2 && (
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-12 animate-in fade-in slide-in-from-right-8 duration-500 relative max-w-2xl mx-auto">
            
            {/* Top Navigation Back Button */}
            <button 
              onClick={() => {
                if (formStep > 1) {
                  setFormStep(prev => (prev - 1) as any);
                } else {
                  setStep(1);
                  setRole("");
                }
              }}
              className="absolute top-6 left-6 text-slate-400 hover:text-orange-500 font-semibold flex items-center transition-colors text-xs md:text-sm cursor-pointer"
            >
              ← Back
            </button>
            
            <div className="text-center mb-6 mt-8">
              <h2 className="text-xl md:text-3xl font-extrabold text-slate-800 mb-1">
                {role === "PARENT" ? "Parent Registration" : "Teacher Registration"}
              </h2>
              <p className="text-slate-400 text-xs md:text-sm">Complete your registration in 3 simple slides.</p>
            </div>

            {/* Form Progress indicator stepper */}
            <div className="flex justify-between items-center max-w-md mx-auto mb-8 relative">
              <div className="flex items-center w-full">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${formStep >= 1 ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white border-slate-200 text-slate-400'}`}>1</div>
                <div className={`flex-grow h-0.5 transition-all duration-300 ${formStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              </div>
              <div className="flex items-center w-full">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${formStep >= 2 ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white border-slate-200 text-slate-400'}`}>2</div>
                <div className={`flex-grow h-0.5 transition-all duration-300 ${formStep >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${formStep >= 3 ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white border-slate-200 text-slate-400'}`}>3</div>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-605 p-4 rounded-xl border border-red-100 flex items-center text-xs font-semibold animate-in shake duration-300">
                  <span className="mr-2">⚠️</span> {error}
                </div>
              )}

              {/* SLIDE 1: Account Details */}
              {formStep === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-base md:text-lg font-bold text-slate-800">Account Details</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Let's set up your access credentials.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-xs md:text-sm" placeholder="hello@example.com" />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Username</label>
                      <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-xs md:text-sm" placeholder="e.g. jdoe99" />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-xs md:text-sm" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                      <input type="tel" required value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-xs md:text-sm" placeholder="+91 9876543210" />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleFormNext}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 px-6 rounded-xl font-bold text-xs md:text-sm shadow-md active:scale-98 transition cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <span>Continue to Profile Details</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SLIDE 2: Personal Details */}
              {formStep === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-base md:text-lg font-bold text-slate-800">Personal Profile</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Tell us a bit about yourself.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Your Full Name</label>
                      <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-xs md:text-sm" placeholder="John Doe" />
                    </div>

                    {role === "PARENT" && (
                      <div>
                        <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Son/Daughter's Name</label>
                        <input type="text" required value={childName} onChange={(e) => setChildName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-xs md:text-sm" placeholder="Alex Doe" />
                      </div>
                    )}

                    {role === "TEACHER" && (
                      <div>
                        <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Qualifications</label>
                        <input type="text" required value={qualifications} onChange={(e) => setQualifications(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-xs md:text-sm" placeholder="e.g. M.Sc Mathematics, B.Ed" />
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setFormStep(1)}
                      className="w-1/3 border border-slate-200 text-slate-700 hover:bg-slate-50 py-3 px-4 rounded-xl font-bold text-xs md:text-sm active:scale-98 transition cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleFormNext}
                      className="w-2/3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 px-6 rounded-xl font-bold text-xs md:text-sm shadow-md active:scale-98 transition cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <span>Continue to Preferences</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SLIDE 3: Academic Preferences */}
              {formStep === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-base md:text-lg font-bold text-slate-800">Academic Preferences</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Let's customize your search or teaching preferences.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        {role === "PARENT" ? "Which group does your child belong to?" : "Which group do you prefer teaching?"}
                      </label>
                      <select
                        value={group}
                        onChange={(e) => {
                          setGroup(e.target.value);
                          setSubGroup(""); 
                          setSelectedSubjects([]);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm text-xs md:text-sm"
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
                        <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Specific Requirement</label>
                        {renderParentSubGroupOptions()}
                      </div>
                    )}

                    {role === "TEACHER" && group && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Subjects</label>
                        <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                          {getSubjectsForGroup(group).map((sub) => (
                            <label key={sub} className="flex items-center space-x-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 transition-all select-none">
                              <input
                                type="checkbox"
                                checked={selectedSubjects.includes(sub)}
                                onChange={() => handleSubjectToggle(sub)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors"
                              />
                              <span className="text-xs font-semibold text-slate-700 truncate">{sub}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setFormStep(2)}
                      className="w-1/3 border border-slate-200 text-slate-700 hover:bg-slate-50 py-3 px-4 rounded-xl font-bold text-xs md:text-sm active:scale-98 transition cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-750 hover:to-orange-550 text-white py-3.5 px-6 rounded-xl font-bold text-xs md:text-sm shadow-md active:scale-98 transition cursor-pointer flex items-center justify-center space-x-1"
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Registering...</span>
                        </span>
                      ) : (
                        <>
                          <span>Complete Registration</span>
                          <span>✓</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ParentSetup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    childClass: "",
    location: "",
    budget: "",
    preferredTiming: "",
    teachingMode: '["Online"]'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:5000/api/parents/profile", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) router.push("/teachers"); // Parents go to browse teachers
      else alert("Setup failed");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Complete Parent Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
        <input className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="Full Name" required onChange={e => setFormData({...formData, fullName: e.target.value})} />
        <input className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="Child's Class (e.g. 10th Grade)" required onChange={e => setFormData({...formData, childClass: e.target.value})} />
        <input className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="Location" required onChange={e => setFormData({...formData, location: e.target.value})} />
        <input className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="Monthly Budget (INR)" type="number" required onChange={e => setFormData({...formData, budget: e.target.value})} />
        <input className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="Preferred Timing (e.g. 5PM - 7PM)" required onChange={e => setFormData({...formData, preferredTiming: e.target.value})} />
        <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-3 rounded-xl font-bold transition shadow-lg shadow-indigo-600/10 cursor-pointer">Save Profile</button>
      </form>
    </div>
  );
}

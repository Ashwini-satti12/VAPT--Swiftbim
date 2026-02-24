import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPM() {
  const [heroImgError, setHeroImgError] = useState(false);
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 border-b border-slate-200 backdrop-blur">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#3d3399] to-[#bc2d75] flex items-center justify-center text-white font-bold text-sm">
              J
            </div>
            <span className="font-semibold text-slate-800">SwiftBIM / Jiffy</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#about" className="hover:text-[#3d3399]">About</a>
            <a href="#features" className="hover:text-[#3d3399]">Features</a>
            <a href="#services" className="hover:text-[#3d3399]">Services</a>
            <a href="#contact" className="hover:text-[#3d3399]">Contact</a>
            <Link to="/login" className="text-[#bc2d75] hover:underline">Sign In</Link>
            <Link to="/client-login" className="text-slate-600 hover:text-[#3d3399]">Client Login</Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-[#3d3399] to-[#bc2d75] text-white text-sm font-medium hover:opacity-90"
            >
              Get Started
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="pt-28 pb-20 px-4 bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 leading-tight mb-4">
              Transforming <br />
              <span className="bg-gradient-to-r from-[#3d3399] via-[#bc2d75] to-[#d276a4] bg-clip-text text-transparent">
                Time into Value
              </span>
            </h1>
            <p className="text-lg text-slate-600 mb-6">
              Powered by{' '}
              <a href="https://mineit.tech/" target="_blank" rel="noreferrer" className="text-[#bc2d75] font-medium hover:underline">
                Merry&apos;s Info-tech New-Gen Educare
              </a>
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#3d3399] to-[#bc2d75] text-white font-medium shadow-lg hover:shadow-xl transition"
              >
                Get Started
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-medium hover:border-[#3d3399] hover:text-[#3d3399] transition"
              >
                Learn More
              </a>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="relative max-w-md w-full aspect-square rounded-2xl bg-gradient-to-br from-[#3d3399]/10 to-[#bc2d75]/10 flex items-center justify-center overflow-hidden">
              {!heroImgError ? (
                <img
                  src="/images/hero-img.png"
                  alt="Hero"
                  className="w-full h-full object-contain"
                  onError={() => setHeroImgError(true)}
                />
              ) : null}
              {heroImgError && (
                <span className="text-slate-400 text-sm">Add /public/images/hero-img.png</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">About Jiffy</h2>
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <p className="text-slate-600 leading-relaxed text-lg">
                <span className="text-2xl font-bold text-[#3d3399]">J</span>iffy is a cutting-edge digital office platform
                that revolutionizes workplace management across all departments. With dedicated panels for HR, Accounts,
                Management, Project Managers, Team Leads, and Employees, Jiffy offers a comprehensive suite of tools to
                streamline operations and enhance collaboration. From recruitment and performance management to project
                oversight and task tracking, Jiffy&apos;s unified platform simplifies workforce management.
              </p>
            </div>
            <div className="flex-1 flex justify-center">
              <img
                src="/images/AboutUs.png"
                alt="About"
                className="max-w-md w-full h-auto rounded-xl shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Task Management', desc: 'Assign, track, and collaborate on tasks with notifications and filters.' },
              { title: 'Project Management', desc: 'Plan, execute, and monitor projects with integrated task tracking.' },
              { title: 'Employee Attendance', desc: 'Track work hours, login times, and late logins in real time.' },
              { title: 'Leave Management', desc: 'Manage leave types, requests, and approvals in one place.' },
              { title: 'Timesheet', desc: 'Log hours and generate monthly reports for accurate time tracking.' },
              { title: 'Notification System', desc: 'Real-time task assignments, leave approvals, and updates.' },
              { title: 'Chat', desc: 'Real-time communication and collaboration within the platform.' },
              { title: 'Live Location Tracking', desc: 'Monitor employee locations for safety and work allocation.' },
              { title: 'Clients Management', desc: 'Add clients, monitor projects, track payments, and maintain records.' },
            ].map((f) => (
              <div key={f.title} className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
                <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-slate-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-4">Our Services</h2>
          <p className="text-center text-slate-600 mb-12">What we offer</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Workforce Management', desc: 'Streamline attendance, leave, and employee-related tasks.' },
              { title: 'Project Management', desc: 'Task assignment, tracking, and collaboration in one place.' },
              { title: 'Employee Services', desc: 'Tasks, leave requests, and communication for every employee.' },
              { title: 'Customize and Integrate', desc: 'Tailor Jiffy and integrate with your existing tools.' },
              { title: 'Support and Training', desc: 'Dedicated support and training to maximize the platform.' },
              { title: 'Security and Compliance', desc: 'Data security and compliance with industry standards.' },
            ].map((s) => (
              <div key={s.title} className="p-6 rounded-xl bg-gradient-to-br from-[#3d3399]/5 to-[#bc2d75]/5 border border-slate-100 hover:border-[#3d3399]/20 transition">
                <h3 className="font-semibold text-slate-800 mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Contact us</h2>
          <p className="text-slate-600 mb-8">
            Have questions? Reach out to our team.
          </p>
          <a
            href="mailto:info@jiffy.mineit.tech"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3d3399] text-white font-medium hover:bg-[#2d2389] transition"
          >
            info@jiffy.mineit.tech
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-800 text-slate-300 text-center text-sm">
        <p>© {new Date().getFullYear()} SwiftBIM / Jiffy. All rights reserved.</p>
      </footer>
    </div>
  );
}

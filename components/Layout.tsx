
import React, { PropsWithChildren } from 'react';
import { useApp } from '../services/AppContext';
import { Role } from '../types';
import { LogOut, LayoutDashboard, ClipboardList, PenTool, User as UserIcon, Menu, X, Clock, Users, HeartPulse, BrainCircuit, Bell, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Layout = ({ children }: PropsWithChildren) => {
  const { currentUser, logout, toasts, removeToast } = useApp();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  if (!currentUser) return <>{children}</>;

  const teacherLinks = [
    { name: 'แดชบอร์ด', path: '/teacher', icon: LayoutDashboard },
    { name: 'จัดการชิ้นงาน', path: '/teacher/assignments', icon: ClipboardList },
    { name: 'บันทึกคะแนน', path: '/teacher/scores', icon: PenTool },
    { name: 'คลังข้อสอบ', path: '/teacher/quizzes', icon: BrainCircuit },
    { name: 'บันทึกเวลาเรียน', path: '/teacher/attendance', icon: Clock },
    { name: 'ข้อมูลสุขภาพ', path: '/teacher/health', icon: HeartPulse },
    { name: 'จัดการนักเรียน', path: '/teacher/students', icon: Users },
  ];

  const studentLinks = [
    { name: 'หน้าหลัก', path: '/student', icon: LayoutDashboard },
    { name: 'งานของฉัน', path: '/student/assignments', icon: ClipboardList },
  ];

  const links = currentUser.role === Role.TEACHER ? teacherLinks : studentLinks;

  const NavContent = () => (
    <>
      <div className="p-6 flex items-center gap-3">
        <img 
          src="https://img5.pic.in.th/file/secure-sv1/-21d5e37cfa61c42627.png" 
          alt="Logo" 
          className="w-10 h-10 object-contain drop-shadow-sm" 
        />
        <div>
          <h2 className="text-xl font-bold text-fg leading-tight">Health & PE</h2>
          <p className="text-xs text-gray-600 font-medium">Score System</p>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-accent text-white shadow-md' 
                  : 'text-gray-700 hover:bg-white/50'
              }`}
            >
              <link.icon size={20} />
              <span className="font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/20">
        <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-white/80 backdrop-blur-sm rounded-xl border border-white/40 shadow-sm">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${currentUser.role === Role.TEACHER ? 'bg-gr5' : 'bg-gr6'}`}>
            {currentUser.name[0]}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate text-gray-800">{currentUser.name}</p>
            <p className="text-xs text-gray-500">{currentUser.role === Role.TEACHER ? 'Teacher' : `Student`}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2 text-white bg-error/80 hover:bg-error rounded-xl transition-colors shadow-sm mt-2"
        >
          <LogOut size={20} />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex font-['Sarabun'] bg-white/30 backdrop-blur-sm">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#7FE5D8]/90 border-r border-white/20 h-screen sticky top-0 shadow-lg z-10 backdrop-blur-md">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-[#7FE5D8]/95 backdrop-blur-md z-50 border-b border-white/20 px-4 py-3 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-2">
           <img src="https://img5.pic.in.th/file/secure-sv1/-21d5e37cfa61c42627.png" alt="Logo" className="w-8 h-8 object-contain" />
           <h2 className="text-xl font-bold text-fg">Health & PE</h2>
         </div>
         <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-700">
           <Menu size={24} />
         </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-64 bg-[#7FE5D8]/95 backdrop-blur-md shadow-2xl flex flex-col">
            <div className="flex justify-end p-4">
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-700 hover:bg-white/20 rounded-full p-1"><X size={24} /></button>
            </div>
            <NavContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto flex flex-col relative">
        <div className="max-w-6xl mx-auto w-full flex-grow">
          {children}
        </div>
        
        {/* Footer */}
        <footer className="mt-12 py-6 flex justify-center">
          <div className="px-6 py-2 rounded-full bg-white/60 border border-white/50 shadow-sm backdrop-blur-md flex items-center gap-2 hover:bg-white/80 transition-colors cursor-default">
            <span className="text-gray-600 text-sm font-medium">พัฒนาและออกแบบโดย</span>
            <span className="text-accent font-bold font-['Mitr'] text-base">Krukai</span>
            <span className="text-gray-400 text-xs border-l border-gray-300 pl-2">@2025</span>
          </div>
        </footer>

        {/* Toast Container */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
          {toasts.map(toast => (
            <div 
              key={toast.id}
              className={`pointer-events-auto w-80 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border-l-4 p-4 flex gap-3 animate-slide-in hover:scale-[1.02] transition-transform ${
                toast.type === 'success' ? 'border-green-500' : 
                toast.type === 'error' ? 'border-red-500' : 'border-blue-500'
              }`}
            >
               <div className={`p-2 rounded-full h-fit ${
                 toast.type === 'success' ? 'bg-green-50 text-green-500' : 
                 toast.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
               }`}>
                 {toast.type === 'success' ? <CheckCircle size={20}/> :
                  toast.type === 'error' ? <AlertTriangle size={20}/> : <Bell size={20}/>}
               </div>
               <div className="flex-1">
                 <h4 className="font-bold text-gray-800 text-sm">{toast.title}</h4>
                 <p className="text-xs text-gray-500 mt-1">{toast.message}</p>
               </div>
               <button 
                 onClick={() => removeToast(toast.id)}
                 className="text-gray-400 hover:text-gray-600 h-fit"
               >
                 <X size={16} />
               </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

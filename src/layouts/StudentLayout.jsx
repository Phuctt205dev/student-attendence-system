import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logoutUser } from '../services/auth.service';
import {
  LayoutDashboard,
  BookOpen,
  LogOut,
  Menu,
  X,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const StudentLayout = ({ children }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/student',
      icon: LayoutDashboard
    },
    {
      name: 'Lớp học',
      href: '/student/classes',
      icon: BookOpen
    }
  ];

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const isActive = (href) => {
    return location.pathname === href;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transform transition-all duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!collapsed && <h2 className="text-xl font-bold text-gray-900">Student Panel</h2>}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 ml-auto"
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-gray-200">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userProfile?.fullName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  MSSV: {userProfile?.studentId || 'N/A'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <button
                key={item.name}
                onClick={() => {
                  if (!item.disabled) {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }
                }}
                disabled={item.disabled}
                title={collapsed ? item.name : ''}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : item.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span>{item.name}</span>
                    {item.disabled && (
                      <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                        Soon
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Đăng xuất' : ''}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition-colors`}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-200 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Top Bar (Mobile) */}
        <div className="sticky top-0 z-10 lg:hidden bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Student Panel</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page Content */}
        <main>{children}</main>
      </div>
    </div>
  );
};

export default StudentLayout;

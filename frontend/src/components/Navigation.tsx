import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { WalletConnectionModal } from "./WalletConnectionModal";
import { RegisterModal } from "./RegisterModal";
import { LoginModal } from "./LoginModal";
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronDown, Search, User, Settings, LogOut, Briefcase, MessageCircle, DollarSign, Shield, Menu, X } from 'lucide-react';

export function Navigation() {
  const [location] = useLocation();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { wallet } = useWalletStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated,
  });

  const unreadCount = notifications?.filter((n: any) => !n.status.read).length || 0;

  const handleSignOut = () => {
    logout();
    window.location.href = '/';
  };

  const navItems = [
    { path: '/projects', label: 'Browse Projects', roles: ['freelancer'] },
    { path: '/find-talent', label: 'Find Talent', roles: ['client'] },
    { path: '/dashboard', label: 'Dashboard', roles: ['client', 'freelancer'] },
    { path: '/messages', label: 'Messages', roles: ['client', 'freelancer'] },
    { path: '/admin', label: 'Admin', roles: ['admin'] }
  ];

  const visibleNavItems = navItems.filter(item => 
    !user?.role || item.roles.includes(user.role)
  );

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-lg border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                TrustDBlock
              </span>
            </Link>

            {/* Mobile Menu Button */}
            {isAuthenticated && (
              <div className="md:hidden flex items-center">
                <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </div>
            )}

            {/* Desktop Navigation Links */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center space-x-8">
                {visibleNavItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`font-medium transition-colors ${
                      location === item.path
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  {/* Search */}
                  <Button variant="ghost" size="sm" data-testid="button-search" className="hidden sm:inline-flex">
                    <Search className="w-4 h-4" />
                  </Button>

                  {/* Notifications */}
                  <Button variant="ghost" size="sm" className="relative hidden sm:inline-flex" data-testid="button-notifications">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center p-0"
                        data-testid="badge-notification-count"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2" data-testid="button-user-menu">
                        <div className="w-8 h-8 bg-gradient-to-r from-primary to-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="hidden sm:block text-sm font-medium">{user?.username}</span>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{user?.username}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                        {wallet?.address && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                          </p>
                        )}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard" className="w-full flex items-center">
                          <Briefcase className="w-4 h-4 mr-2" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="w-full flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/messages" className="w-full flex items-center">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Messages
                        </Link>
                      </DropdownMenuItem>
                      {user?.role === 'freelancer' && (
                        <DropdownMenuItem asChild>
                          <Link href="/earnings" className="w-full flex items-center">
                            <DollarSign className="w-4 h-4 mr-2" />
                            Earnings
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href="/settings" className="w-full flex items-center">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setShowLoginModal(true)}
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex"
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => setShowRegisterModal(true)}
                    variant="default"
                    size="sm"
                    className="hidden sm:flex"
                  >
                    Register
                  </Button>
                  <Button
                    onClick={() => setShowWalletModal(true)}
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex"
                    data-testid="button-connect-wallet"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Navigation Links */}
          {isAuthenticated && isMobileMenuOpen && (
            <div className="md:hidden pb-4">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`block py-2 font-medium transition-colors ${
                    location === item.path
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)} 
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col space-y-2 mt-4">
                <Button variant="ghost" size="sm" data-testid="button-search-mobile" className="justify-start">
                  <Search className="w-4 h-4 mr-2" /> Search
                </Button>
                <Button variant="ghost" size="sm" className="relative justify-start" data-testid="button-notifications-mobile">
                  <Bell className="w-4 h-4 mr-2" /> Notifications
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-2 w-5 h-5 text-xs flex items-center justify-center p-0"
                      data-testid="badge-notification-count-mobile"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Mobile Auth Buttons */}
          {!isAuthenticated && isMobileMenuOpen && (
            <div className="md:hidden pb-4">
              <div className="flex flex-col space-y-2">
                <Button
                  onClick={() => setShowLoginModal(true)}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  Login
                </Button>
                <Button
                  onClick={() => setShowRegisterModal(true)}
                  variant="default"
                  size="sm"
                  className="w-full justify-start"
                >
                  Register
                </Button>
                <Button
                  onClick={() => setShowWalletModal(true)}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  data-testid="button-connect-wallet-mobile"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <WalletConnectionModal open={showWalletModal} onOpenChange={setShowWalletModal} />
      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
      <RegisterModal open={showRegisterModal} onOpenChange={setShowRegisterModal} />
    </>
  );
}
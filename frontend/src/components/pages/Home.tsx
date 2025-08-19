import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectCard } from '@/components/ProjectCard';
import { WalletConnectionModal } from '@/components/WalletConnectionModal';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { Shield, Rocket, Users, Search, Eye, ShieldCheck, Medal, Gavel, Star, CheckCircle, Bell, Clock, DollarSign } from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Fetch featured projects
  const { data: projects } = useQuery({
    queryKey: ['/api/projects', { limit: 6, status: 'open' }],
    refetchInterval: false,
  });

  const featuredProjects = projects?.slice(0, 6) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-accent/20">
        <div className="absolute inset-0 blockchain-gradient opacity-5"></div>
        <div className="relative container-mobile py-12 sm:py-16 md:py-20">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="space-y-6 sm:space-y-8 animate-fade-in text-center lg:text-left">
              <div className="space-y-4">
                <Badge className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-accent text-accent-foreground text-xs sm:text-sm" data-testid="badge-blockchain-secured">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Blockchain-Secured Freelancing
                </Badge>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight" data-testid="text-hero-title">
                  Trust-First
                  <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"> Web3</span>
                  <br />Freelance Platform
                </h1>
                
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0" data-testid="text-hero-description">
                  Experience secure, transparent freelancing with blockchain-powered escrow, smart contracts, and decentralized reputation systems.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  <Button asChild size="lg" className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90" data-testid="button-browse-projects">
                    <Link href="/projects">
                      <Search className="w-5 h-5 mr-2" />
                      Browse Projects
                    </Link>
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setShowWalletModal(true)}
                    size="lg" 
                    className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
                    data-testid="button-start-freelancing"
                  >
                    <Rocket className="w-5 h-5 mr-2" />
                    Start Freelancing
                  </Button>
                )}
                
                <Button variant="outline" size="lg" asChild data-testid="button-hire-talent">
                  <Link href="/projects/new">
                    <Users className="w-5 h-5 mr-2" />
                    Hire Talent
                  </Link>
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-8">
                <div className="text-center" data-testid="stat-freelancers">
                  <div className="text-3xl font-bold text-foreground">5.2K+</div>
                  <div className="text-muted-foreground">Active Freelancers</div>
                </div>
                <div className="text-center" data-testid="stat-paid">
                  <div className="text-3xl font-bold text-foreground">$2.1M+</div>
                  <div className="text-muted-foreground">Paid Securely</div>
                </div>
                <div className="text-center" data-testid="stat-success">
                  <div className="text-3xl font-bold text-foreground">98%</div>
                  <div className="text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="relative">
              <div className="absolute -inset-4 blockchain-gradient opacity-20 blur-3xl rounded-3xl"></div>
              <Card className="relative shadow-2xl">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Active Projects</h3>
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-accent to-blue-50 dark:to-blue-950/20 rounded-xl border border-accent-foreground/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-accent-foreground">DeFi Dashboard</span>
                        <Badge variant="outline" className="text-green-700 border-green-600 bg-green-50">Active</Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mb-2">
                        <div className="bg-gradient-to-r from-primary to-blue-600 h-2 rounded-full w-3/4"></div>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>75% Complete</span>
                        <span>$4,500 ETH</span>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl border border-purple-100 dark:border-purple-900/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-400">NFT Marketplace</span>
                        <Badge variant="outline" className="text-blue-700 border-blue-600 bg-blue-50">Review</Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mb-2">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full w-[90%]"></div>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>90% Complete</span>
                        <span>$8,200 ETH</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Blockchain Verified & Secured</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4" data-testid="text-how-it-works-title">How TrustDBlock Works</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-how-it-works-description">
              Experience the future of freelancing with blockchain-powered security and transparency
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center space-y-6 p-6 card-hover" data-testid="card-how-it-works-wallet">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-accent to-blue-100 dark:to-blue-950/20 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Connect Your Wallet</h3>
              <p className="text-muted-foreground leading-relaxed">
                Connect your Web3 wallet to access our decentralized platform. Support for MetaMask, WalletConnect, and more.
              </p>
            </Card>

            <Card className="text-center space-y-6 p-6 card-hover" data-testid="card-how-it-works-escrow">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/20 dark:to-purple-950/20 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Smart Contract Escrow</h3>
              <p className="text-muted-foreground leading-relaxed">
                Funds are securely held in smart contracts until milestones are completed, ensuring trust for both parties.
              </p>
            </Card>

            <Card className="text-center space-y-6 p-6 card-hover" data-testid="card-how-it-works-reputation">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/20 dark:to-pink-950/20 rounded-2xl flex items-center justify-center">
                <Medal className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Build Reputation</h3>
              <p className="text-muted-foreground leading-relaxed">
                Earn blockchain-verified reputation tokens and NFT badges that showcase your expertise and trustworthiness.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Projects Section */}
      {featuredProjects.length > 0 && (
        <section className="py-20 bg-accent/10" data-testid="section-featured-projects">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <div>
                <h2 className="text-4xl font-bold text-foreground mb-4" data-testid="text-featured-projects-title">Featured Projects</h2>
                <p className="text-xl text-muted-foreground" data-testid="text-featured-projects-description">Discover high-quality Web3 projects from trusted clients</p>
              </div>
              <Button asChild data-testid="button-view-all-projects">
                <Link href="/projects">View All Projects</Link>
              </Button>
            </div>

            {/* Filter Bar */}
            <Card className="mb-8 p-6">
              <div className="grid md:grid-cols-4 gap-4">
                <Select data-testid="select-category">
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="writing">Writing</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select data-testid="select-budget">
                  <SelectTrigger>
                    <SelectValue placeholder="Budget Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Budgets</SelectItem>
                    <SelectItem value="500-1000">$500 - $1,000</SelectItem>
                    <SelectItem value="1000-5000">$1,000 - $5,000</SelectItem>
                    <SelectItem value="5000+">$5,000+</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select data-testid="select-timeline">
                  <SelectTrigger>
                    <SelectValue placeholder="Timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Timelines</SelectItem>
                    <SelectItem value="1week">1 week</SelectItem>
                    <SelectItem value="2-4weeks">2-4 weeks</SelectItem>
                    <SelectItem value="1-3months">1-3 months</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90" data-testid="button-search-projects">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </Card>

            {/* Project Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust & Security Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4" data-testid="text-security-title">Built for Trust & Security</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-security-description">
              Advanced blockchain technology ensures every transaction is secure, transparent, and verifiable
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center space-y-4 p-6 card-hover" data-testid="card-security-escrow">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/20 dark:to-emerald-950/20 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Smart Contract Escrow</h3>
              <p className="text-muted-foreground">Automated escrow system ensures payments are released only when milestones are completed</p>
            </Card>

            <Card className="text-center space-y-4 p-6 card-hover" data-testid="card-security-transparency">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl flex items-center justify-center">
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Full Transparency</h3>
              <p className="text-muted-foreground">All transactions and project history are permanently recorded on the blockchain</p>
            </Card>

            <Card className="text-center space-y-4 p-6 card-hover" data-testid="card-security-reputation">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/20 dark:to-pink-950/20 rounded-2xl flex items-center justify-center">
                <Medal className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Verifiable Reputation</h3>
              <p className="text-muted-foreground">Blockchain-based reputation system with NFT badges that can't be faked</p>
            </Card>

            <Card className="text-center space-y-4 p-6 card-hover" data-testid="card-security-dispute">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-950/20 dark:to-red-950/20 rounded-2xl flex items-center justify-center">
                <Gavel className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Dispute Resolution</h3>
              <p className="text-muted-foreground">Decentralized arbitration system for fair and transparent dispute resolution</p>
            </Card>
          </div>
        </div>
      </section>

      <WalletConnectionModal open={showWalletModal} onOpenChange={setShowWalletModal} />
    </div>
  );
}

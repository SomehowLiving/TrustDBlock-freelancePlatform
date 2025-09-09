import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ProjectCard } from '@/components/ProjectCard';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@store/authStore';
import { Link } from 'wouter';
import { Search, Filter, Plus, Briefcase } from 'lucide-react';

export default function Projects() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['/api/projects', { 
      search: searchQuery || undefined,
      category: selectedCategory || undefined,
      status: selectedStatus || 'open',
      limit: 20 
    }],
    refetchInterval: false,
  });

  const handleSearch = () => {
    // Query will automatically re-run due to dependency on searchQuery
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedBudget('');
    setSelectedStatus('');
  };

  const categories = ['Development', 'Design', 'Marketing', 'Writing', 'Consulting', 'Other'];
  const budgetRanges = [
    { label: '$500 - $1,000', value: '500-1000' },
    { label: '$1,000 - $5,000', value: '1000-5000' },
    { label: '$5,000 - $10,000', value: '5000-10000' },
    { label: '$10,000+', value: '10000+' }
  ];

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive" data-testid="text-error-message">Failed to load projects. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8" data-testid="projects-container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-projects-title">
            Browse Projects
          </h1>
          <p className="text-muted-foreground" data-testid="text-projects-description">
            Discover amazing Web3 projects and start your next collaboration
          </p>
        </div>
        {user?.role === 'client' && (
          <Button asChild data-testid="button-post-project">
            <Link href="/projects/new">
              <Plus className="w-4 h-4 mr-2" />
              Post Project
            </Link>
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card data-testid="card-search-filters">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search projects by title, description, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="input-search"
              />
            </div>
            <Button onClick={handleSearch} data-testid="button-search">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Filter Controls */}
          <div className="grid md:grid-cols-4 gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory} data-testid="select-category">
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedBudget} onValueChange={setSelectedBudget} data-testid="select-budget">
              <SelectTrigger>
                <SelectValue placeholder="Budget Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Budgets</SelectItem>
                {budgetRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus} data-testid="select-status">
              <SelectTrigger>
                <SelectValue placeholder="Project Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="open">Open for Applications</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
              Clear Filters
            </Button>
          </div>

          {/* Active Filters */}
          {(searchQuery || selectedCategory || selectedBudget || selectedStatus) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" data-testid="badge-filter-search">
                  Search: {searchQuery}
                </Badge>
              )}
              {selectedCategory && (
                <Badge variant="secondary" data-testid="badge-filter-category">
                  Category: {selectedCategory}
                </Badge>
              )}
              {selectedBudget && (
                <Badge variant="secondary" data-testid="badge-filter-budget">
                  Budget: {budgetRanges.find(r => r.value === selectedBudget)?.label}
                </Badge>
              )}
              {selectedStatus && (
                <Badge variant="secondary" data-testid="badge-filter-status">
                  Status: {selectedStatus}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div>
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="projects-loading">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground" data-testid="text-results-count">
                Found {projects.length} projects
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="projects-grid">
              {projects.map((project: any) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {/* Load More */}
            {projects.length >= 20 && (
              <div className="text-center mt-8">
                <Button variant="outline" data-testid="button-load-more">
                  Load More Projects
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card data-testid="card-no-results">
            <CardContent className="text-center py-12">
              <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Projects Found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || selectedCategory || selectedBudget || selectedStatus
                  ? 'Try adjusting your search criteria or filters'
                  : 'No projects are currently available'
                }
              </p>
              {(searchQuery || selectedCategory || selectedBudget || selectedStatus) && (
                <Button variant="outline" onClick={clearFilters} data-testid="button-clear-all-filters">
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

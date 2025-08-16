import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  DollarSign, 
  Clock, 
  Users,
  MapPin,
  Star,
  Briefcase
} from 'lucide-react';

export const Projects: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBudget, setSelectedBudget] = useState('all');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'web-development', label: 'Web Development' },
    { value: 'mobile-development', label: 'Mobile Development' },
    { value: 'blockchain', label: 'Blockchain' },
    { value: 'design', label: 'Design' },
    { value: 'marketing', label: 'Marketing' },
  ];

  const budgetRanges = [
    { value: 'all', label: 'All Budgets' },
    { value: '0-1000', label: '$0 - $1,000' },
    { value: '1000-5000', label: '$1,000 - $5,000' },
    { value: '5000-10000', label: '$5,000 - $10,000' },
    { value: '10000+', label: '$10,000+' },
  ];

  const skillOptions = [
    'React', 'Node.js', 'Python', 'Blockchain', 'Smart Contracts', 
    'UI/UX Design', 'Mobile Development', 'Machine Learning'
  ];

  const projects = [
    {
      id: 1,
      title: 'DeFi Trading Platform Development',
      description: 'Build a comprehensive DeFi trading platform with advanced features including yield farming, liquidity pools, and governance mechanisms.',
      budget: '$8,000 - $12,000',
      duration: '3-4 months',
      client: 'CryptoTech Solutions',
      clientRating: 4.8,
      clientLocation: 'United States',
      postedTime: '2 hours ago',
      proposals: 12,
      skills: ['React', 'Node.js', 'Blockchain', 'Smart Contracts'],
      category: 'blockchain',
      isUrgent: true,
      verified: true,
    },
    {
      id: 2,
      title: 'React Native Mobile App for Healthcare',
      description: 'Develop a mobile application for healthcare management with patient records, appointment scheduling, and telemedicine features.',
      budget: '$5,000 - $8,000',
      duration: '2-3 months',
      client: 'HealthTech Inc.',
      clientRating: 4.9,
      clientLocation: 'Canada',
      postedTime: '1 day ago',
      proposals: 8,
      skills: ['React Native', 'Node.js', 'MongoDB', 'API Integration'],
      category: 'mobile-development',
      isUrgent: false,
      verified: true,
    },
    {
      id: 3,
      title: 'E-commerce Website with Payment Integration',
      description: 'Create a modern e-commerce website with advanced payment processing, inventory management, and analytics dashboard.',
      budget: '$3,000 - $5,000',
      duration: '1-2 months',
      client: 'RetailCorp',
      clientRating: 4.6,
      clientLocation: 'United Kingdom',
      postedTime: '3 days ago',
      proposals: 15,
      skills: ['React', 'Express.js', 'PostgreSQL', 'Stripe API'],
      category: 'web-development',
      isUrgent: false,
      verified: false,
    },
    {
      id: 4,
      title: 'AI-Powered Analytics Dashboard',
      description: 'Build an analytics dashboard with machine learning capabilities for data visualization and predictive analytics.',
      budget: '$6,000 - $10,000',
      duration: '2-3 months',
      client: 'DataInsights Pro',
      clientRating: 4.7,
      clientLocation: 'Germany',
      postedTime: '5 days ago',
      proposals: 6,
      skills: ['Python', 'Machine Learning', 'React', 'Data Analytics'],
      category: 'web-development',
      isUrgent: false,
      verified: true,
    },
  ];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
    const matchesSkills = selectedSkills.length === 0 || 
                         selectedSkills.some(skill => project.skills.includes(skill));
    
    return matchesSearch && matchesCategory && matchesSkills;
  });

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Browse Projects</h1>
          <p className="text-gray-600 mt-1">Find your next opportunity from {projects.length} available projects</p>
        </div>
        <Link
          to="/projects/create"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Briefcase className="w-5 h-5 mr-2" />
          Post a Project
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Projects</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Budget</label>
            <select
              value={selectedBudget}
              onChange={(e) => setSelectedBudget(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {budgetRanges.map(budget => (
                <option key={budget.value} value={budget.value}>
                  {budget.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Skills Filter */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
          <div className="flex flex-wrap gap-2">
            {skillOptions.map(skill => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedSkills.includes(skill)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Showing {filteredProjects.length} of {projects.length} projects
        </p>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Newest First</option>
            <option>Budget: High to Low</option>
            <option>Budget: Low to High</option>
            <option>Most Proposals</option>
          </select>
        </div>
      </div>

      {/* Project Cards */}
      <div className="space-y-6">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                    <Link to={`/projects/${project.id}`}>
                      {project.title}
                    </Link>
                  </h3>
                  {project.isUrgent && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                      Urgent
                    </span>
                  )}
                  {project.verified && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Verified Client
                    </span>
                  )}
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {project.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {project.budget}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {project.duration}
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {project.proposals} proposals
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {project.clientLocation}
                  </div>
                </div>
              </div>

              <div className="lg:text-right space-y-3">
                <div className="flex lg:flex-col items-center lg:items-end space-x-4 lg:space-x-0 lg:space-y-2">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                    <span className="font-medium">{project.clientRating}</span>
                  </div>
                  <span className="text-sm text-gray-600">{project.client}</span>
                </div>
                <div className="text-sm text-gray-500">Posted {project.postedTime}</div>
                <Link
                  to={`/projects/${project.id}`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {filteredProjects.length > 0 && (
        <div className="text-center">
          <button className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            Load More Projects
          </button>
        </div>
      )}
    </div>
  );
};
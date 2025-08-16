import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  ArrowRight, 
  DollarSign, 
  Calendar, 
  Users, 
  Upload,
  Plus,
  X,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const projectSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  description: z.string().min(100, 'Description must be at least 100 characters'),
  category: z.string().min(1, 'Category is required'),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  budgetMin: z.number().min(100, 'Minimum budget must be at least $100'),
  budgetMax: z.number().min(100, 'Maximum budget must be at least $100'),
  timeline: z.string().min(1, 'Timeline is required'),
  experienceLevel: z.enum(['entry', 'intermediate', 'expert']),
  projectType: z.enum(['fixed', 'hourly']),
});

type ProjectForm = z.infer<typeof projectSchema>;

export const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [milestones, setMilestones] = useState([
    { title: '', amount: 0, description: '', duration: '' }
  ]);
  const [attachments, setAttachments] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    trigger,
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      skills: [],
      experienceLevel: 'intermediate',
      projectType: 'fixed',
    },
  });

  const categories = [
    'Web Development',
    'Mobile Development',
    'Blockchain Development',
    'UI/UX Design',
    'Data Science',
    'DevOps',
    'Content Writing',
    'Digital Marketing',
    'Other',
  ];

  const popularSkills = [
    'React', 'Node.js', 'Python', 'JavaScript', 'TypeScript',
    'Blockchain', 'Smart Contracts', 'Solidity', 'Web3',
    'UI/UX Design', 'Figma', 'Adobe Creative Suite',
    'Machine Learning', 'Data Analytics', 'AI',
    'AWS', 'Docker', 'Kubernetes', 'DevOps',
  ];

  const budgetMin = watch('budgetMin');
  const budgetMax = watch('budgetMax');

  const addSkill = (skill: string) => {
    if (skill && !selectedSkills.includes(skill)) {
      const newSkills = [...selectedSkills, skill];
      setSelectedSkills(newSkills);
      setValue('skills', newSkills);
    }
  };

  const removeSkill = (skill: string) => {
    const newSkills = selectedSkills.filter(s => s !== skill);
    setSelectedSkills(newSkills);
    setValue('skills', newSkills);
  };

  const addCustomSkill = () => {
    if (customSkill.trim()) {
      addSkill(customSkill.trim());
      setCustomSkill('');
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, { title: '', amount: 0, description: '', duration: '' }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: string, value: string | number) => {
    const updated = milestones.map((milestone, i) => 
      i === index ? { ...milestone, [field]: value } : milestone
    );
    setMilestones(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const nextStep = async () => {
    const isValid = await trigger();
    if (isValid) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const onSubmit = async (data: ProjectForm) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Project created:', {
        ...data,
        milestones,
        attachments,
      });

      toast.success('Project created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const totalMilestoneAmount = milestones.reduce((sum, milestone) => sum + milestone.amount, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
            <p className="text-gray-600">Step {step} of 3</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <span className="ml-2 font-medium">Project Details</span>
          </div>
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
            <span className="ml-2 font-medium">Budget & Timeline</span>
          </div>
          <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              3
            </div>
            <span className="ml-2 font-medium">Review & Submit</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Project Details */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Project Details</h2>

            {/* Project Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Title *
              </label>
              <input
                {...register('title')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Build a modern e-commerce website with React"
              />
              {errors.title && (
                <p className="mt-1 text-red-600 text-sm">{errors.title.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                {...register('category')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category.toLowerCase().replace(' ', '-')}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-red-600 text-sm">{errors.category.message}</p>
              )}
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Description *
              </label>
              <textarea
                {...register('description')}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your project in detail. Include requirements, goals, and any specific features you need..."
              />
              {errors.description && (
                <p className="mt-1 text-red-600 text-sm">{errors.description.message}</p>
              )}
            </div>

            {/* Skills Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills Required *
              </label>
              
              {/* Selected Skills */}
              {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedSkills.map(skill => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Popular Skills */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Popular Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {popularSkills.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => addSkill(skill)}
                      disabled={selectedSkills.includes(skill)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        selectedSkills.includes(skill)
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Skill Input */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                  placeholder="Add a custom skill..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Add
                </button>
              </div>

              {errors.skills && (
                <p className="mt-1 text-red-600 text-sm">{errors.skills.message}</p>
              )}
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience Level Required
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'entry', label: 'Entry Level', desc: 'New to this field' },
                  { value: 'intermediate', label: 'Intermediate', desc: '2-5 years experience' },
                  { value: 'expert', label: 'Expert', desc: '5+ years experience' },
                ].map(level => (
                  <label key={level.value} className="cursor-pointer">
                    <input
                      {...register('experienceLevel')}
                      type="radio"
                      value={level.value}
                      className="sr-only"
                    />
                    <div className={`p-4 border rounded-lg text-center transition-colors ${
                      watch('experienceLevel') === level.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <div className="font-medium text-gray-900">{level.label}</div>
                      <div className="text-sm text-gray-500">{level.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Budget & Timeline */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Budget & Timeline</h2>

            {/* Project Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'fixed', label: 'Fixed Price', desc: 'Pay a fixed amount for the entire project' },
                  { value: 'hourly', label: 'Hourly Rate', desc: 'Pay per hour of work completed' },
                ].map(type => (
                  <label key={type.value} className="cursor-pointer">
                    <input
                      {...register('projectType')}
                      type="radio"
                      value={type.value}
                      className="sr-only"
                    />
                    <div className={`p-4 border rounded-lg transition-colors ${
                      watch('projectType') === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <div className="font-medium text-gray-900">{type.label}</div>
                      <div className="text-sm text-gray-500">{type.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Budget Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Range (USD) *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Minimum Budget</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      {...register('budgetMin', { valueAsNumber: true })}
                      type="number"
                      min="100"
                      step="100"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1000"
                    />
                  </div>
                  {errors.budgetMin && (
                    <p className="mt-1 text-red-600 text-sm">{errors.budgetMin.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Maximum Budget</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      {...register('budgetMax', { valueAsNumber: true })}
                      type="number"
                      min="100"
                      step="100"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="5000"
                    />
                  </div>
                  {errors.budgetMax && (
                    <p className="mt-1 text-red-600 text-sm">{errors.budgetMax.message}</p>
                  )}
                </div>
              </div>
              {budgetMin && budgetMax && budgetMax <= budgetMin && (
                <p className="mt-1 text-red-600 text-sm">Maximum budget must be greater than minimum budget</p>
              )}
            </div>

            {/* Timeline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Timeline *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  {...register('timeline')}
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 2-3 months, 6 weeks, 1 month"
                />
              </div>
              {errors.timeline && (
                <p className="mt-1 text-red-600 text-sm">{errors.timeline.message}</p>
              )}
            </div>

            {/* Milestones */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700">
                  Project Milestones (Optional)
                </label>
                <button
                  type="button"
                  onClick={addMilestone}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Milestone
                </button>
              </div>
              
              <div className="space-y-4">
                {milestones.map((milestone, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Milestone {index + 1}</h4>
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(index)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <input
                        type="text"
                        placeholder="Milestone title"
                        value={milestone.title}
                        onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Amount ($)"
                        value={milestone.amount || ''}
                        onChange={(e) => updateMilestone(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <textarea
                        placeholder="Milestone description"
                        value={milestone.description}
                        onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                        rows={2}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Duration (e.g., 1 week)"
                        value={milestone.duration}
                        onChange={(e) => updateMilestone(index, 'duration', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ))}
                
                {totalMilestoneAmount > 0 && (
                  <div className="text-right">
                    <span className="text-sm text-gray-600">
                      Total Milestone Amount: <span className="font-medium text-gray-900">${totalMilestoneAmount}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="space-y-6">
            {/* File Attachments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Attachments (Optional)</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-2">Upload project requirements, mockups, or reference files</p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Choose Files
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="p-1 text-red-600 hover:text-red-800 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Project Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Project Title</h4>
                  <p className="text-gray-700">{watch('title') || 'Not specified'}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Category</h4>
                  <p className="text-gray-700">{watch('category') || 'Not specified'}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Budget Range</h4>
                  <p className="text-gray-700">
                    ${watch('budgetMin') || 0} - ${watch('budgetMax') || 0}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Timeline</h4>
                  <p className="text-gray-700">{watch('timeline') || 'Not specified'}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Skills Required</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedSkills.map(skill => (
                      <span
                        key={skill}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating Project...' : 'Create Project'}
                <Users className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
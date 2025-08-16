import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const applicationSchema = z.object({
  coverLetter: z.string().min(100, 'Cover letter must be at least 100 characters'),
  proposedBudget: z.number().min(1, 'Budget must be greater than 0'),
  timeline: z.string().min(1, 'Timeline is required'),
  portfolioLinks: z.array(z.string().url('Invalid URL')).optional(),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

interface ApplicationModalProps {
  projectId: number;
  projectTitle: string;
  onClose: () => void;
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({
  projectId,
  projectTitle,
  onClose,
}) => {
  const [milestones, setMilestones] = useState([
    { title: '', amount: 0, duration: '' }
  ]);
  const [portfolioLinks, setPortfolioLinks] = useState(['']);
  const [attachments, setAttachments] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
  });

  const addMilestone = () => {
    setMilestones([...milestones, { title: '', amount: 0, duration: '' }]);
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

  const addPortfolioLink = () => {
    setPortfolioLinks([...portfolioLinks, '']);
  };

  const removePortfolioLink = (index: number) => {
    setPortfolioLinks(portfolioLinks.filter((_, i) => i !== index));
  };

  const updatePortfolioLink = (index: number, value: string) => {
    const updated = portfolioLinks.map((link, i) => i === index ? value : link);
    setPortfolioLinks(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ApplicationForm) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Application submitted:', {
        ...data,
        milestones,
        portfolioLinks: portfolioLinks.filter(link => link.trim()),
        attachments,
        projectId,
      });

      toast.success('Application submitted successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to submit application');
    }
  };

  const totalMilestoneAmount = milestones.reduce((sum, milestone) => sum + milestone.amount, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Submit Application</h2>
            <p className="text-gray-600 mt-1">{projectTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Cover Letter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Letter *
            </label>
            <textarea
              {...register('coverLetter')}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Explain why you're the best fit for this project..."
            />
            {errors.coverLetter && (
              <p className="mt-1 text-red-600 text-sm">{errors.coverLetter.message}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Proposed Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proposed Budget (USD) *
              </label>
              <input
                {...register('proposedBudget', { valueAsNumber: true })}
                type="number"
                min="0"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="5000"
              />
              {errors.proposedBudget && (
                <p className="mt-1 text-red-600 text-sm">{errors.proposedBudget.message}</p>
              )}
            </div>

            {/* Timeline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Timeline *
              </label>
              <input
                {...register('timeline')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="2-3 months"
              />
              {errors.timeline && (
                <p className="mt-1 text-red-600 text-sm">{errors.timeline.message}</p>
              )}
            </div>
          </div>

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700">
                Project Milestones
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
            
            <div className="space-y-3">
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
                  
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        placeholder="Milestone title"
                        value={milestone.title}
                        onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Amount ($)"
                        value={milestone.amount || ''}
                        onChange={(e) => updateMilestone(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Duration (e.g., 1 week)"
                      value={milestone.duration}
                      onChange={(e) => updateMilestone(index, 'duration', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
              
              {totalMilestoneAmount > 0 && (
                <div className="text-right">
                  <span className="text-sm text-gray-600">
                    Total: <span className="font-medium text-gray-900">${totalMilestoneAmount}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Portfolio Links */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700">
                Portfolio Links (Optional)
              </label>
              <button
                type="button"
                onClick={addPortfolioLink}
                className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Link
              </button>
            </div>
            
            <div className="space-y-2">
              {portfolioLinks.map((link, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="url"
                    placeholder="https://your-portfolio.com"
                    value={link}
                    onChange={(e) => updatePortfolioLink(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {portfolioLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePortfolioLink(index)}
                      className="p-2 text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Optional)
            </label>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-2">Drop files here or click to upload</p>
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
              <div className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
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

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
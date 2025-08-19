import { useState } from 'react';
import { useRouter } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Plus, X, Calendar, DollarSign, Clock, Tag } from 'lucide-react';

const projectSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  category: z.string().min(1, 'Please select a category'),
  budget: z.object({
    total: z.number().min(100, 'Budget must be at least $100'),
    type: z.enum(['fixed', 'hourly'])
  }),
  timeline: z.object({
    deadline: z.string().min(1, 'Please set a deadline'),
    expectedDuration: z.number().optional()
  }),
  milestones: z.object({
    expected: z.number().min(1, 'At least 1 milestone is required')
  }),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  requirements: z.object({
    experience: z.string(),
    deliverables: z.array(z.string())
  }).optional()
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function CreateProject() {
  const [, setLocation] = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [deliverableInput, setDeliverableInput] = useState('');
  const [deliverables, setDeliverables] = useState<string[]>([]);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      budget: {
        total: 0,
        type: 'fixed'
      },
      timeline: {
        deadline: '',
        expectedDuration: 30
      },
      milestones: {
        expected: 1
      },
      skills: [],
      requirements: {
        experience: 'intermediate',
        deliverables: []
      }
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/projects', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Project Created Successfully!",
        description: "Your project has been posted and is now visible to freelancers.",
      });
      setLocation(`/projects/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Project",
        description: error.message || "Please check your input and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    // Add skills and deliverables to the form data
    const projectData = {
      ...data,
      skills,
      requirements: {
        ...data.requirements,
        deliverables
      }
    };

    createProjectMutation.mutate(projectData);
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
      form.setValue('skills', [...skills, skillInput.trim()]);
    }
  };

  const removeSkill = (skillToRemove: string) => {
    const updatedSkills = skills.filter(skill => skill !== skillToRemove);
    setSkills(updatedSkills);
    form.setValue('skills', updatedSkills);
  };

  const addDeliverable = () => {
    if (deliverableInput.trim() && !deliverables.includes(deliverableInput.trim())) {
      setDeliverables([...deliverables, deliverableInput.trim()]);
      setDeliverableInput('');
    }
  };

  const removeDeliverable = (deliverableToRemove: string) => {
    setDeliverables(deliverables.filter(deliverable => deliverable !== deliverableToRemove));
  };

  const categories = [
    'Development',
    'Design', 
    'Writing',
    'Marketing',
    'Consulting',
    'Other'
  ];

  const experienceLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'expert', label: 'Expert' }
  ];

  // Redirect if not a client
  if (user?.role !== 'client') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-semibold text-foreground mb-2">Client Account Required</h3>
            <p className="text-muted-foreground">
              Only clients can post projects. Please switch to a client account to continue.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" data-testid="create-project-container">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-create-project-title">
            Post a New Project
          </h1>
          <p className="text-muted-foreground" data-testid="text-create-project-description">
            Find the perfect freelancer for your Web3 project
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <Card data-testid="card-basic-info">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Project Title *</label>
                <Input
                  placeholder="e.g., Build a DeFi Dashboard with React and Web3"
                  {...form.register('title')}
                  className="mt-1"
                  data-testid="input-project-title"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Category *</label>
                <Select onValueChange={(value) => form.setValue('category', value)} data-testid="select-project-category">
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Project Description *</label>
                <Textarea
                  placeholder="Describe your project in detail. Include what you want to build, specific requirements, and any important information freelancers should know."
                  {...form.register('description')}
                  className="mt-1"
                  rows={6}
                  data-testid="textarea-project-description"
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Budget and Timeline */}
          <Card data-testid="card-budget-timeline">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Budget & Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Budget Type *</label>
                  <Select 
                    onValueChange={(value: 'fixed' | 'hourly') => form.setValue('budget.type', value)}
                    defaultValue="fixed"
                    data-testid="select-budget-type"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select budget type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="hourly">Hourly Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Total Budget ($) *</label>
                  <Input
                    type="number"
                    placeholder="5000"
                    {...form.register('budget.total', { valueAsNumber: true })}
                    className="mt-1"
                    data-testid="input-project-budget"
                  />
                  {form.formState.errors.budget?.total && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.budget.total.message}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Project Deadline *</label>
                  <Input
                    type="date"
                    {...form.register('timeline.deadline')}
                    className="mt-1"
                    min={new Date().toISOString().split('T')[0]}
                    data-testid="input-project-deadline"
                  />
                  {form.formState.errors.timeline?.deadline && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.timeline.deadline.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Expected Duration (days)</label>
                  <Input
                    type="number"
                    placeholder="30"
                    {...form.register('timeline.expectedDuration', { valueAsNumber: true })}
                    className="mt-1"
                    data-testid="input-expected-duration"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Number of Milestones *</label>
                <Input
                  type="number"
                  placeholder="3"
                  min="1"
                  {...form.register('milestones.expected', { valueAsNumber: true })}
                  className="mt-1"
                  data-testid="input-milestone-count"
                />
                {form.formState.errors.milestones?.expected && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.milestones.expected.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Skills Required */}
          <Card data-testid="card-skills-required">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                Skills Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Add Skills *</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="e.g., React, Solidity, Web3.js"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    data-testid="input-skill"
                  />
                  <Button type="button" onClick={addSkill} data-testid="button-add-skill">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {form.formState.errors.skills && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.skills.message}</p>
                )}
              </div>

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1" data-testid={`badge-skill-${index}`}>
                      {skill}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card data-testid="card-requirements">
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Experience Level</label>
                <Select 
                  onValueChange={(value) => form.setValue('requirements.experience', value)}
                  defaultValue="intermediate"
                  data-testid="select-experience-level"
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Deliverables</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="e.g., Responsive website, Smart contract code, Documentation"
                    value={deliverableInput}
                    onChange={(e) => setDeliverableInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDeliverable())}
                    data-testid="input-deliverable"
                  />
                  <Button type="button" onClick={addDeliverable} data-testid="button-add-deliverable">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {deliverables.length > 0 && (
                <div className="space-y-2">
                  {deliverables.map((deliverable, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded" data-testid={`deliverable-item-${index}`}>
                      <span className="text-sm">{deliverable}</span>
                      <X 
                        className="w-4 h-4 cursor-pointer hover:text-destructive" 
                        onClick={() => removeDeliverable(deliverable)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setLocation('/dashboard')}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createProjectMutation.isPending}
              className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
              data-testid="button-post-project"
            >
              {createProjectMutation.isPending ? 'Posting...' : 'Post Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

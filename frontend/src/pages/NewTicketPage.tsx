import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { CATEGORY_LABEL, PRIORITY_LABEL, type Category, type Priority } from '@/types/ticket';

export function NewTicketPage() {
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!subject.trim()) nextErrors.subject = 'Subject is required.';
    if (!description.trim()) nextErrors.description = 'Description is required.';
    if (!category) nextErrors.category = 'Choose a category.';
    if (!priority) nextErrors.priority = 'Choose a priority.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    toast.success('Ticket created');
    navigate('/tickets');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <LinkButton to="/tickets" variant="ghost" size="sm" leadingIcon={<ArrowLeft className="size-4" />}>
        Back to tickets
      </LinkButton>

      <Card>
        <CardHeader title="Raise a ticket" description="Give agents enough to act on immediately." />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Subject"
              placeholder="Short summary of the issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              error={errors.subject}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                placeholder="Select a category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                options={Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))}
                error={errors.category}
                required
              />
              <Select
                label="Priority"
                placeholder="Select a priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))}
                error={errors.priority}
                required
              />
            </div>

            <Textarea
              label="Description"
              placeholder="What happened, when it started, and what you have already tried"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={errors.description}
              required
            />

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <LinkButton to="/tickets" variant="secondary">
                Cancel
              </LinkButton>
              <Button type="submit">Submit ticket</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

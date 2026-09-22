import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useCreateTicket } from '@/hooks/useTickets';
import { CATEGORIES, CATEGORY_LABEL, PRIORITIES, PRIORITY_LABEL } from '@/types/ticket';

// Client-side validation is a courtesy; the server enforces the same rules.
const newTicketSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(5000),
  category: z.enum(CATEGORIES, { message: 'Choose a category' }),
  priority: z.enum(PRIORITIES, { message: 'Choose a priority' }),
});

type NewTicketValues = z.infer<typeof newTicketSchema>;

export function NewTicketPage() {
  const navigate = useNavigate();
  const createTicket = useCreateTicket();

  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<NewTicketValues>({
    resolver: zodResolver(newTicketSchema),
  });

  async function onSubmit(values: NewTicketValues) {
    const ticket = await createTicket.mutateAsync(values).catch(() => null);
    // The hook already toasts the failure; only navigate on a real ticket.
    if (ticket) navigate(`/tickets/${ticket.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <LinkButton
        to="/tickets"
        variant="ghost"
        size="sm"
        leadingIcon={<ArrowLeft className="size-4" />}
      >
        Back to tickets
      </LinkButton>

      <Card>
        <CardHeader
          title="Raise a ticket"
          description="Give agents enough to act on immediately."
        />
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input
              label="Subject"
              placeholder="Short summary of the issue"
              error={errors.subject?.message}
              required
              {...field('subject')}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                placeholder="Select a category"
                options={CATEGORIES.map((value) => ({ value, label: CATEGORY_LABEL[value] }))}
                error={errors.category?.message}
                required
                {...field('category')}
              />
              <Select
                label="Priority"
                placeholder="Select a priority"
                options={PRIORITIES.map((value) => ({ value, label: PRIORITY_LABEL[value] }))}
                error={errors.priority?.message}
                required
                {...field('priority')}
              />
            </div>

            <Textarea
              label="Description"
              placeholder="What happened, when it started, and what you have already tried"
              error={errors.description?.message}
              required
              {...field('description')}
            />

            <p className="text-xs text-subtle">
              Response and resolution targets are set from the priority when the ticket is created,
              in business hours.
            </p>

            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <LinkButton to="/tickets" variant="secondary">
                Cancel
              </LinkButton>
              <Button type="submit" isLoading={createTicket.isPending}>
                Submit ticket
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

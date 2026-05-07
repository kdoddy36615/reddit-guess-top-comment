'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster, useToast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        open dialog
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>delete this run?</DialogTitle>
          <DialogDescription>
            this will remove your daily run for today. you can&apos;t replay it.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" size="md" onClick={() => setOpen(false)}>
              cancel
            </Button>
            <Button variant="danger" size="md" onClick={() => setOpen(false)}>
              delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        size="md"
        onClick={() =>
          toast({
            title: 'guess submitted',
            description: 'we matched it against the thread.',
          })
        }
      >
        fire default
      </Button>
      <Button
        variant="danger"
        size="md"
        onClick={() =>
          toast({
            title: 'submission failed',
            description: 'your guess didn’t reach the server. try again.',
            variant: 'error',
          })
        }
      >
        fire error
      </Button>
    </div>
  );
}

function TabsDemo() {
  return (
    <Tabs defaultValue="today">
      <TabsList aria-label="leaderboard scope">
        <TabsTrigger value="today">today</TabsTrigger>
        <TabsTrigger value="week">week</TabsTrigger>
        <TabsTrigger value="all-time">all-time</TabsTrigger>
      </TabsList>
      <TabsContent value="today">
        <p className="text-sm text-text-muted">today’s board contents would render here.</p>
      </TabsContent>
      <TabsContent value="week">
        <p className="text-sm text-text-muted">week-to-date board contents.</p>
      </TabsContent>
      <TabsContent value="all-time">
        <p className="text-sm text-text-muted">all-time leaderboard contents.</p>
      </TabsContent>
    </Tabs>
  );
}

function TooltipDemo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Tooltip content="show post body">
        <button
          type="button"
          className="rounded-pill border border-border-strong bg-surface px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          hover or focus me
        </button>
      </Tooltip>
      <Tooltip content="bottom" side="bottom">
        <button
          type="button"
          className="rounded-pill border border-border-strong bg-surface px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          side: bottom
        </button>
      </Tooltip>
      <Tooltip content="100ms" delayMs={100}>
        <button
          type="button"
          className="rounded-pill border border-border-strong bg-surface px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          delay: 100ms
        </button>
      </Tooltip>
    </div>
  );
}

export function DialogSection() {
  return (
    <section id="dialog" className="scroll-mt-20 space-y-4">
      <header>
        <h2 className="font-display font-semibold text-2xl text-text">Dialog</h2>
        <p className="font-mono text-text-faint text-xs">
          shadcn-derived · bg-surface-2 · border-border-strong · rounded-xl · 200ms ease-out
        </p>
      </header>
      <DialogDemo />
    </section>
  );
}

export function ToastSection() {
  return (
    <section id="toast" className="scroll-mt-20 space-y-4">
      <header>
        <h2 className="font-display font-semibold text-2xl text-text">Toast</h2>
        <p className="font-mono text-text-faint text-xs">
          top-right desktop · bottom-center mobile · 4000ms default · 6000ms error
        </p>
      </header>
      <ToastDemo />
      <Toaster />
    </section>
  );
}

export function TabsSection() {
  return (
    <section id="tabs" className="scroll-mt-20 space-y-4">
      <header>
        <h2 className="font-display font-semibold text-2xl text-text">Tabs</h2>
        <p className="font-mono text-text-faint text-xs">
          pill style · accent-soft on active · arrow-key nav
        </p>
      </header>
      <TabsDemo />
    </section>
  );
}

export function TooltipSection() {
  return (
    <section id="tooltip" className="scroll-mt-20 space-y-4">
      <header>
        <h2 className="font-display font-semibold text-2xl text-text">Tooltip</h2>
        <p className="font-mono text-text-faint text-xs">
          400ms delay · bg-surface-2 · text-xs · text-text-muted
        </p>
      </header>
      <TooltipDemo />
    </section>
  );
}

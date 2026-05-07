import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';

function ControlledHarness({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="dialog">
          <DialogTitle>title</DialogTitle>
          <DialogDescription>desc</DialogDescription>
          <button type="button" onClick={() => setOpen(false)}>
            close
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(<ControlledHarness initialOpen={false} />);
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('renders dialog content with role=dialog and aria-modal when opened', async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    await user.click(screen.getByText('open'));
    const dialog = screen.getByTestId('dialog');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('applies surface-2 + border-strong + rounded-xl tokens to content', async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    await user.click(screen.getByText('open'));
    const dialog = screen.getByTestId('dialog');
    expect(dialog.className).toMatch(/bg-surface-2\b/);
    expect(dialog.className).toMatch(/border-border-strong\b/);
    expect(dialog.className).toMatch(/rounded-xl\b/);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<ControlledHarness initialOpen />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<ControlledHarness initialOpen />);
    const overlay = screen.getByTestId('dialog-overlay');
    await user.click(overlay);
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('does not close when clicking inside content', async () => {
    const user = userEvent.setup();
    render(<ControlledHarness initialOpen />);
    const dialog = screen.getByTestId('dialog');
    await user.click(dialog);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('uses fade + slide-up animation utilities under motion-safe', async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    await user.click(screen.getByText('open'));
    const dialog = screen.getByTestId('dialog');
    expect(dialog.className).toMatch(/motion-safe:/);
  });

  it('wires aria-labelledby and aria-describedby to title/description ids', async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    await user.click(screen.getByText('open'));
    const dialog = screen.getByTestId('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(labelledBy).toBeTruthy();
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(labelledBy as string)?.textContent).toBe('title');
    expect(document.getElementById(describedBy as string)?.textContent).toBe('desc');
  });
});

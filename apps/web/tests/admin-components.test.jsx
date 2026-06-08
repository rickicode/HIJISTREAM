// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// ─── Mock api module ───
vi.mock('../src/utils/api', () => ({
  default: {
    deleteAdminSubtitle: vi.fn(),
    refreshAdminSubtitle: vi.fn(),
  },
}));

import ConfirmDialog from '../src/components/admin/ConfirmDialog';

describe('ConfirmDialog', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  const defaultProps = {
    open: true,
    title: 'Delete Item',
    message: 'Are you sure you want to delete this?',
    confirmLabel: 'Hapus',
    cancelLabel: 'Batal',
    danger: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when open=false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Delete Item')).toBeNull();
  });

  it('renders title and message when open=true', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Delete Item')).toBeDefined();
    expect(screen.getByText('Are you sure you want to delete this?')).toBeDefined();
  });

  it('renders confirm and cancel buttons with custom labels', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);
    const dialog = container.querySelector('[role="dialog"]');
    const buttons = dialog.querySelectorAll('button');
    const labelTexts = Array.from(buttons).map((b) => b.textContent);
    expect(labelTexts).toContain('Hapus');
    expect(labelTexts).toContain('Batal');
  });

  it('calls onCancel when cancel button is clicked', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);
    const dialog = container.querySelector('[role="dialog"]');
    const cancelBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Batal',
    );
    fireEvent.click(cancelBtn);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);
    const dialog = container.querySelector('[role="dialog"]');
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Hapus',
    );
    fireEvent.click(confirmBtn);
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    const backdrop = document.querySelector('.fixed.inset-0');
    expect(backdrop).toBeDefined();
    fireEvent.click(backdrop);
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('does not call onCancel when dialog body is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeDefined();
    fireEvent.click(dialog);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when Escape key is pressed', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('shows danger icon when danger=true', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} danger />);
    const dialog = container.querySelector('[role="dialog"]');
    const dangerIcon = dialog.querySelector('.bg-red-400\\/10');
    expect(dangerIcon).toBeDefined();
  });

  it('does not show danger icon when danger=false', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} danger={false} />);
    const dialog = container.querySelector('[role="dialog"]');
    const dangerIcon = dialog.querySelector('.bg-red-400\\/10');
    expect(dangerIcon).toBeNull();
  });

  it('has proper ARIA attributes', () => {
    render(<ConfirmDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-dialog-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('confirm-dialog-message');
  });

  it('locks body scroll when open', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', () => {
    const { unmount } = render(<ConfirmDialog {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});

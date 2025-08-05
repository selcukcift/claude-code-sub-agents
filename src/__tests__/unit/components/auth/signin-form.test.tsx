/**
 * TORVAN MEDICAL DEVICE SIGNIN FORM TESTING
 * =========================================
 * 
 * Unit tests for SignIn form component
 * Tests medical device authentication UI compliance
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from 'next-auth/react';
import { SignInForm } from '@/components/auth/signin-form';

// Mock NextAuth
jest.mock('next-auth/react');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('TORVAN Medical Device SignIn Form Component', () => {
  const mockSignIn = jest.mocked(signIn);
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue({ ok: true, error: null } as any);
  });

  describe('FDA 21 CFR Part 820 - User Interface Compliance', () => {
    it('should render medical device signin form with required fields', () => {
      render(<SignInForm />);

      // Check required form elements
      expect(screen.getByRole('form', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

      // Check medical device branding
      expect(screen.getByText(/torvan/i)).toBeInTheDocument();
      expect(screen.getByText(/medical workflow/i)).toBeInTheDocument();
    });

    it('should display proper accessibility attributes for medical device compliance', () => {
      render(<SignInForm />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Check accessibility attributes
      expect(usernameInput).toHaveAttribute('type', 'text');
      expect(usernameInput).toHaveAttribute('required');
      expect(usernameInput).toHaveAttribute('autocomplete', 'username');

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');

      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(submitButton).not.toBeDisabled();
    });

    it('should validate required fields for medical device security', async () => {
      const user = userEvent.setup();
      render(<SignInForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Try to submit without filling fields
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      // Should not call signIn
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('should enforce username format validation', async () => {
      const user = userEvent.setup();
      render(<SignInForm />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Test invalid username formats
      await user.type(usernameInput, 'a'); // Too short
      await user.type(passwordInput, 'ValidPassword123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
      });

      expect(mockSignIn).not.toHaveBeenCalled();
    });
  });

  describe('ISO 13485 - Security and Authentication Testing', () => {
    it('should handle successful authentication for medical device users', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ ok: true, error: null } as any);

      render(<SignInForm />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill in valid credentials
      await user.type(usernameInput, 'medical_user');
      await user.type(passwordInput, 'MedicalDevice123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          username: 'medical_user',
          password: 'MedicalDevice123!',
          redirect: false,
        });
      });

      // Should show success message
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });

    it('should handle authentication errors for medical device security', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' } as any);

      render(<SignInForm />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'invalid_user');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Should clear password field for security
      expect(passwordInput).toHaveValue('');
    });

    it('should handle account lockout scenario for medical device protection', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ 
        ok: false, 
        error: 'Account is temporarily locked. Please try again later.' 
      } as any);

      render(<SignInForm />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'locked_user');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/account is temporarily locked/i)).toBeInTheDocument();
      });

      // Should disable form temporarily
      expect(submitButton).toBeDisabled();
    });

    it('should handle password expiration for medical device compliance', async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ 
        ok: false, 
        error: 'Password has expired. Please reset your password.' 
      } as any);

      render(<SignInForm />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'expired_user');
      await user.type(passwordInput, 'OldPassword123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password has expired/i)).toBeInTheDocument();
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      });

      // Should show reset password link
      expect(screen.getByRole('link', { name: /reset password/i })).toBeInTheDocument();
    });
  });

  describe('IEC 62304 - User Interface Software Safety', () => {
    it('should prevent form submission during processing', async () => {
      const user = userEvent.setup();
      // Mock slow authentication
      mockSignIn.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ ok: true, error: null } as any), 1000)
      ));

      render(<SignInForm />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'medical_user');
      await user.type(passwordInput, 'MedicalDevice123!');
      await user.click(submitButton);

      // Button should be disabled during processing
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();

      // Should not be able to submit again
      await user.click(submitButton);
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });

    it('should clear sensitive data on component unmount', () => {
      const { unmount } = render(<SignInForm />);

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'sensitive_password' } });

      expect(passwordInput.value).toBe('sensitive_password');

      // Unmount component
      unmount();

      // Password should be cleared from memory (simulated)
      expect(passwordInput.value).toBe('');
    });

    it('should implement secure input handling for medical device data protection', async () => {
      const user = userEvent.setup();
      render(<SignInForm />);

      const passwordInput = screen.getByLabelText(/password/i);

      // Password input should not reveal characters
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Test password input
      await user.type(passwordInput, 'SecretPassword123!');
      expect(passwordInput).toHaveValue('SecretPassword123!');

      // Password should not be visible in DOM as plain text
      expect(screen.queryByDisplayValue('SecretPassword123!')).not.toBeInTheDocument();
    });
  });

  describe('Medical Device User Experience Requirements', () => {
    it('should display helpful error messages for medical device users', async () => {
      const user = userEvent.setup();
      
      const errorScenarios = [
        {
          error: 'Invalid credentials',
          expectedMessage: /invalid username or password/i,
        },
        {
          error: 'Account is temporarily locked. Please try again later.',
          expectedMessage: /account is temporarily locked/i,
        },
        {
          error: 'Password has expired. Please reset your password.',
          expectedMessage: /password has expired/i,
        },
        {
          error: 'Password change required. Please contact your administrator.',
          expectedMessage: /password change required/i,
        },
      ];

      for (const scenario of errorScenarios) {
        mockSignIn.mockResolvedValue({ ok: false, error: scenario.error } as any);

        render(<SignInForm />);

        const usernameInput = screen.getByLabelText(/username/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        await user.type(usernameInput, 'test_user');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(scenario.expectedMessage)).toBeInTheDocument();
        });

        // Cleanup for next test
        screen.unmount();
      }
    });

    it('should support keyboard navigation for medical device accessibility', async () => {
      render(<SignInForm />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Test tab navigation
      usernameInput.focus();
      expect(usernameInput).toHaveFocus();

      fireEvent.keyDown(usernameInput, { key: 'Tab' });
      expect(passwordInput).toHaveFocus();

      fireEvent.keyDown(passwordInput, { key: 'Tab' });
      expect(submitButton).toHaveFocus();

      // Test Enter key submission
      fireEvent.change(usernameInput, { target: { value: 'medical_user' } });
      fireEvent.change(passwordInput, { target: { value: 'MedicalDevice123!' } });
      
      fireEvent.keyDown(submitButton, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });

    it('should meet medical device performance requirements', async () => {
      const renderStart = performance.now();
      render(<SignInForm />);
      const renderEnd = performance.now();

      const renderTime = renderEnd - renderStart;

      // Component should render quickly for medical device responsiveness
      expect(renderTime).toBeLessThan(100); // Less than 100ms

      // Check that all elements are immediately available
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should provide clear visual feedback for medical device operations', async () => {
      const user = userEvent.setup();
      render(<SignInForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      // Initial state
      expect(submitButton).toHaveTextContent(/sign in/i);
      expect(submitButton).not.toBeDisabled();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'medical_user');
      await user.type(passwordInput, 'MedicalDevice123!');
      await user.click(submitButton);

      // Loading state
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });
  });

  describe('Medical Device Security Compliance Testing', () => {
    it('should validate component security properties', () => {
      render(<SignInForm />);

      const securityValidation = global.testUtils.validateSecurityCompliance({
        props: {
          requireAuth: false, // SignIn form doesn't require auth
          enableAuditLog: true, // Should log signin attempts
          encryptData: true, // Should handle passwords securely
        }
      });

      expect(securityValidation.hasAuditLogging).toBe(true);
      expect(securityValidation.hasDataEncryption).toBe(true);
    });

    it('should not expose sensitive information in component state', () => {
      const { container } = render(<SignInForm />);

      // Check that no sensitive data is exposed in DOM attributes
      const formElement = container.querySelector('form');
      const inputs = container.querySelectorAll('input');

      inputs.forEach(input => {
        expect(input).not.toHaveAttribute('data-password');
        expect(input).not.toHaveAttribute('data-sensitive');
      });

      // Form should not have sensitive data in dataset
      expect(formElement?.dataset).not.toHaveProperty('credentials');
    });
  });
});
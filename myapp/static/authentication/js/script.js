// Enhanced Authentication JavaScript for Landing Page Style

// Alert message handling
var close = document.getElementsByClassName("closebtn");
var i;

for (i = 0; i < close.length; i++) {
    close[i].onclick = function() {
        var div = this.parentElement;
        div.style.opacity = "0";
        setTimeout(function() {
            div.style.display = "none";
        }, 300);
    };

    // Auto-hide alerts after 8 seconds
    (function(index) {
        setTimeout(function() {
            if (close[index] && close[index].parentElement) {
                var div = close[index].parentElement;
                div.style.opacity = "0";
                setTimeout(function() {
                    div.style.display = "none";
                }, 300);
            }
        }, 8000);
    })(i);
}

// Enhanced password toggle function
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const toggle = field.nextElementSibling.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        toggle.classList.remove('fa-eye-slash');
        toggle.classList.add('fa-eye');
    } else {
        field.type = 'password';
        toggle.classList.remove('fa-eye');
        toggle.classList.add('fa-eye-slash');
    }
}

// Legacy support for old toggle function
function togglePassword() {
    var passwordInput = document.getElementById("pass1");
    var toggleButton = document.querySelector(".toggle-password");
    
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
    } else {
        passwordInput.type = "password";
        toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
    }
}

// Form validation and enhancement
document.addEventListener('DOMContentLoaded', function() {
    // Password strength validation
    const pass1 = document.getElementById('pass1');
    const pass2 = document.getElementById('pass2');
    
    if (pass1) {
        pass1.addEventListener('input', function() {
            const password = this.value;
            
            // Password strength indicator
            if (password.length >= 8) {
                this.classList.remove('error');
                this.classList.add('success');
            } else {
                this.classList.remove('success');
                if (password.length > 0) {
                    this.classList.add('error');
                }
            }
            
            // Check password match if confirm field exists
            if (pass2 && pass2.value) {
                if (password === pass2.value) {
                    pass2.classList.remove('error');
                    pass2.classList.add('success');
                } else {
                    pass2.classList.add('error');
                    pass2.classList.remove('success');
                }
            }
        });
    }
    
    if (pass2) {
        pass2.addEventListener('input', function() {
            const password = pass1.value;
            const confirmPassword = this.value;
            
            if (confirmPassword && password === confirmPassword) {
                this.classList.remove('error');
                this.classList.add('success');
            } else if (confirmPassword) {
                this.classList.remove('success');
                this.classList.add('error');
            }
        });
    }
    
    // Username validation
    const username = document.getElementById('username');
    if (username) {
        username.addEventListener('input', function() {
            const value = this.value;
            const isValid = /^[a-zA-Z0-9]+$/.test(value);
            
            if (value.length > 0) {
                if (isValid && value.length >= 3) {
                    this.classList.remove('error');
                    this.classList.add('success');
                } else {
                    this.classList.add('error');
                    this.classList.remove('success');
                }
            } else {
                this.classList.remove('error', 'success');
            }
        });
    }
    
    // Email validation
    const email = document.getElementById('email');
    if (email) {
        email.addEventListener('input', function() {
            const value = this.value;
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            
            if (value.length > 0) {
                if (isValid) {
                    this.classList.remove('error');
                    this.classList.add('success');
                } else {
                    this.classList.add('error');
                    this.classList.remove('success');
                }
            } else {
                this.classList.remove('error', 'success');
            }
        });
    }
    
    // Form submission with loading state
    const authForms = document.querySelectorAll('.auth-form');
    authForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('.btn-primary');
            const isSignUp = this.querySelector('#pass2') !== null;
            
            // Basic validation
            let isValid = true;
            const requiredFields = this.querySelectorAll('input[required]');
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    field.classList.add('error');
                    isValid = false;
                } else {
                    field.classList.remove('error');
                }
            });
            
            // Password match validation for signup
            if (isSignUp && pass1 && pass2) {
                if (pass1.value !== pass2.value) {
                    pass2.classList.add('error');
                    isValid = false;
                }
            }
            
            if (!isValid) {
                e.preventDefault();
                return false;
            }
            
            // Ensure form action ends with trailing slash
            let formAction = form.getAttribute('action');
            if (formAction && !formAction.endsWith('/')) {
                form.setAttribute('action', formAction + '/');
            }
            
            // Show loading state
            if (submitBtn) {
                submitBtn.classList.add('loading');
                if (isSignUp) {
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
                } else {
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
                }
                submitBtn.disabled = true;
            }
        });
    });
    
    // Smooth focus animations
    const formControls = document.querySelectorAll('.form-control');
    formControls.forEach(control => {
        control.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        control.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
});

// Disable right-click context menu (optional security feature)
// Uncomment if needed
/*
document.addEventListener('contextmenu', function(e) {
    alert("Sorry, you can't view or copy source codes this way!");
    e.preventDefault();
});
*/

// Add some visual feedback for form interactions
function addFormInteractivity() {
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn-primary');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Initialize form interactivity when DOM is loaded
document.addEventListener('DOMContentLoaded', addFormInteractivity);
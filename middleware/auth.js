// Authentication Middleware

// Check if user is authenticated
function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  console.log('🔐 Unauthorized access attempt to:', req.path);
  return res.status(401).json({ 
    error: 'Authentication required', 
    message: 'Please log in with Google to access this resource',
    loginUrl: '/auth/google'
  });
}

// Check if user is authenticated (for API calls)
function requireApiAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  console.log('🔐 Unauthorized API access attempt to:', req.path);
  return res.status(401).json({ 
    error: 'Authentication required', 
    message: 'API access requires authentication',
    authenticated: false
  });
}

// Optional auth - continues regardless of auth status
function optionalAuth(req, res, next) {
  // Just continue - some routes might want to know auth status but not require it
  next();
}

// Admin check (you can customize this based on email domains or specific users)
function requireAdmin(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Example: Only allow users from specific domain or email addresses
  const user = req.user;
  const allowedDomains = ['your-company.com']; // Customize this
  const allowedEmails = ['admin@example.com']; // Customize this
  
  if (allowedEmails.includes(user.email)) {
    return next();
  }

  const userDomain = user.email.split('@')[1];
  if (allowedDomains.includes(userDomain)) {
    return next();
  }

  console.log('🚫 Admin access denied for user:', user.email);
  return res.status(403).json({ 
    error: 'Insufficient permissions', 
    message: 'Admin access required' 
  });
}

module.exports = {
  requireAuth,
  requireApiAuth,
  optionalAuth,
  requireAdmin
};

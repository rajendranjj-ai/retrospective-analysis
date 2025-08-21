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

// Company domain check - restrict access to company employees only
function requireCompanyDomain(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.user;
  const companyDomain = process.env.COMPANY_DOMAIN; // e.g., "company.com"
  const allowedDomains = companyDomain ? [companyDomain] : [];
  const allowedEmails = process.env.ALLOWED_EMAILS ? 
    process.env.ALLOWED_EMAILS.split(',').map(email => email.trim()) : [];
  
  // Check if user email is specifically allowed
  if (allowedEmails.includes(user.email)) {
    console.log('✅ Access granted for whitelisted user:', user.email);
    return next();
  }

  // Check if user belongs to company domain
  if (companyDomain) {
    const userDomain = user.email.split('@')[1];
    if (allowedDomains.includes(userDomain)) {
      console.log('✅ Access granted for company employee:', user.email);
      return next();
    }
  }

  // If no domain restrictions, allow all authenticated users
  if (!companyDomain && allowedEmails.length === 0) {
    console.log('⚠️ No domain restrictions set - allowing all authenticated users');
    return next();
  }

  console.log('🚫 Company access denied for user:', user.email);
  console.log('🏢 Required domain:', companyDomain);
  return res.status(403).json({ 
    error: 'Access denied', 
    message: `Access is restricted to ${companyDomain ? `@${companyDomain}` : 'authorized'} users only`,
    userDomain: user.email.split('@')[1]
  });
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
  requireCompanyDomain,
  requireAdmin
};

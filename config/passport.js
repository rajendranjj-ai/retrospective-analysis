const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const authConfig = require('./auth');

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: authConfig.google.clientID,
  clientSecret: authConfig.google.clientSecret,
  callbackURL: authConfig.google.callbackURL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Create user object from Google profile
    const user = {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      picture: profile.photos[0].value,
      provider: 'google'
    };

    console.log('✅ Google OAuth successful for user:', user.email);
    return done(null, user);
  } catch (error) {
    console.error('❌ Google OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;

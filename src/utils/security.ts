// Security: Enhanced session validation with comprehensive checks
export const isSessionValid = (session: any): boolean => {
  if (!session || typeof session !== 'object') return false;
  
  // Check required properties
  if (!session.access_token || typeof session.access_token !== 'string') return false;
  if (!session.user || typeof session.user !== 'object') return false;
  if (!session.user.id || typeof session.user.id !== 'string') return false;
  
  // Check token format (basic JWT structure check)
  const tokenParts = session.access_token.split('.');
  if (tokenParts.length !== 3) return false;
  
  // Check expiration
  if (session.expires_at) {
    const expirationTime = typeof session.expires_at === 'number' 
      ? session.expires_at * 1000 
      : new Date(session.expires_at).getTime();
    
    if (expirationTime < Date.now()) return false;
  }
  
  // Check user object structure
  if (!session.user.email || typeof session.user.email !== 'string') return false;
  if (!isValidEmail(session.user.email)) return false;
  
  return true;
};
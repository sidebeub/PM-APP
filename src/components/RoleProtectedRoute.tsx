import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ProtectedRoute from './ProtectedRoute';
import { UserRole } from '../types';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

/**
 * A component that protects routes based on user roles.
 * It first checks if the user is authenticated, then checks if the user has the required role.
 */
const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <ProtectedRoute>
      {user && allowedRoles.includes(user.role as UserRole) ? (
        <>{children}</>
      ) : (
        <Navigate to="/unauthorized" replace />
      )}
    </ProtectedRoute>
  );
};

export default RoleProtectedRoute;

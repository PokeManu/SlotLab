import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from './auth';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);


      console.log('Ruolo corrente:', authService.role);
    console.log('È amministratore:', authService.isAdmin());


  if(authService.isAdmin()){
    return true;
  }

  return router.createUrlTree(['/home']);
};

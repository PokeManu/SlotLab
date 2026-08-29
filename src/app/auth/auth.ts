import { Injectable } from '@angular/core';
export type UserRole = 'admin' | 'user';
 
@Injectable({
    providedIn: 'root',
})
export class Auth{
   private currentRole: UserRole = 'admin';
   
   get role():UserRole{
    return this.currentRole;
   }

   isAdmin():boolean{
    return this.currentRole === 'admin';
   }

   setRole(role: UserRole):void{
    this.currentRole = role;
   }
}

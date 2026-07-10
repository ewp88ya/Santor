import {
  getUser
} from "./user.service.js";


export async function userController(id:string){

  return getUser(id);

}

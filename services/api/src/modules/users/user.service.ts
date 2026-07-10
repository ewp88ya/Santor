import {
  findUserById
} from "./user.repository.js";


export async function getUser(id:string){

  return findUserById(id);

}

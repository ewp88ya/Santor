import { prisma } from "../../config/database.js";


export function findUserById(id:string){

  return prisma.user.findUnique({
    where:{
      id,
    },
  });

}

import { prisma } from "../../config/database.js";



export async function findUserByEmail(
  email: string
) {

  return prisma.user.findUnique({

    where: {
      email,
    },

    include: {

      tenant: true,

      role: true,

    },

  });

}





export async function createUser(
  data: {
    email: string;
    name?: string;
    password: string;
  }
) {


  const defaultTenant =
    await prisma.tenant.findFirst();



  if (!defaultTenant) {

    throw new Error(
      "Default tenant not found"
    );

  }



  const defaultRole =
    await prisma.role.findFirst({

      where: {
        name: "USER",
      },

    });



  if (!defaultRole) {

    throw new Error(
      "Default role not found"
    );

  }



  return prisma.user.create({

    data: {

      email: data.email,

      name: data.name,

      password: data.password,


      tenantId:
        defaultTenant.id,


      roleId:
        defaultRole.id,

    },

    include: {

      tenant: true,

      role: true,

    },

  });

}

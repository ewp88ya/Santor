import argon2 from "argon2";

import {
  findUserByEmail,
  createUser,
} from "./auth.repository.js";

import {
  signToken,
} from "./jwt.js";



export async function register(
  email: string,
  password: string,
  name?: string
) {

  const existing =
    await findUserByEmail(email);


  if (existing) {

    throw new Error(
      "Email already registered"
    );

  }


  const hashedPassword =
    await argon2.hash(password);



  const user =
    await createUser({

      email,

      name,

      password: hashedPassword,

    });



  return {

    id: user.id,

    email: user.email,

    token:
      signToken({

        id: user.id,

        email: user.email,

      }),

  };

}





export async function login(
  email: string,
  password: string
) {


  const user =
    await findUserByEmail(email);



  if (!user) {

    throw new Error(
      "Invalid credentials"
    );

  }



  const valid =
    await argon2.verify(
      user.password,
      password
    );



  if (!valid) {

    throw new Error(
      "Invalid credentials"
    );

  }



  return {

    id: user.id,

    email: user.email,

    token:
      signToken({

        id: user.id,

        email: user.email,

      }),

  };


}

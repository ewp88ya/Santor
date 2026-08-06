import { prisma } from '../src/config/database.js';

const products = await prisma.product.findMany();

console.log(JSON.stringify(products,null,2));

process.exit();

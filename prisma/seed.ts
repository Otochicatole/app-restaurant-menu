import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@restaurant.com";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  });

  const groupDefs: { name: string; description: string }[] = [
    { name: "Hamburguesas", description: "Nuestras hamburguesas artesanales con ingredientes frescos" },
    { name: "Pizzas", description: "Pizzas artesanales horneadas en horno de leña" },
    { name: "Bebidas", description: "Bebidas refrescantes para acompañar tu comida" },
    { name: "Postres", description: "El toque dulce para cerrar tu experiencia" },
    { name: "Entradas", description: "Abre tu apetito con nuestras entradas" },
    { name: "Ensaladas", description: "Frescas, crujientes y llenas de sabor" },
    { name: "Pastas", description: "Pastas artesanales con salsas caseras" },
    { name: "Carnes", description: "Cortes selectos preparados a la perfección" },
    { name: "Pescados", description: "Lo mejor del mar, fresco cada día" },
    { name: "Sushi", description: "Rolls frescos preparados al momento" },
    { name: "Tacos", description: "Auténticos tacos con tortilla artesanal" },
    { name: "Desayunos", description: "Comienza tu día con energía" },
  ];

  const groups = [];
  for (const def of groupDefs) {
    const group = await prisma.group.upsert({
      where: { name: def.name },
      update: { description: def.description },
      create: def,
    });
    groups.push(group);
  }

  const productDefs: { name: string; description: string; price: number; groupIdx: number }[] = [
    { name: "Hamburguesa Clasica", description: "Carne de res, lechuga, tomate, queso, cebolla", price: 12.99, groupIdx: 0 },
    { name: "Hamburguesa BBQ", description: "Doble carne, bacon, cebolla caramelizada, salsa BBQ", price: 15.99, groupIdx: 0 },
    { name: "Hamburguesa de Pollo", description: "Pollo grillado, aguacate, lechuga, mayonesa", price: 13.99, groupIdx: 0 },
    { name: "Hamburguesa Veggie", description: "Hamburguesa de garbanzos, espinaca, hummus", price: 11.99, groupIdx: 0 },

    { name: "Pizza Margherita", description: "Salsa de tomate, mozzarella, albahaca fresca", price: 10.99, groupIdx: 1 },
    { name: "Pizza Pepperoni", description: "Salsa de tomate, mozzarella, pepperoni", price: 12.99, groupIdx: 1 },
    { name: "Pizza Hawaiana", description: "Salsa de tomate, mozzarella, jamon, piña", price: 13.99, groupIdx: 1 },
    { name: "Pizza Cuatro Quesos", description: "Mozzarella, gorgonzola, parmesano, fontina", price: 14.99, groupIdx: 1 },

    { name: "Coca-Cola", description: "Lata 355ml", price: 2.99, groupIdx: 2 },
    { name: "Agua Mineral", description: "Botella 500ml", price: 1.99, groupIdx: 2 },
    { name: "Limonada Natural", description: "Jugo de limon fresco, azucar, menta", price: 3.99, groupIdx: 2 },
    { name: "Jugo de Naranja", description: "Naranjas exprimidas al momento, 400ml", price: 4.49, groupIdx: 2 },

    { name: "Tiramisu", description: "Postre clasico italiano con mascarpone y cafe", price: 6.99, groupIdx: 3 },
    { name: "Cheesecake", description: "Tarta de queso cremosa con frutos rojos", price: 5.99, groupIdx: 3 },
    { name: "Helado Artesanal", description: "Dos bolas: chocolate, vainilla o fresa", price: 4.99, groupIdx: 3 },

    { name: "Bruschetta", description: "Pan tostado con tomate, albahaca y aceite de oliva", price: 7.99, groupIdx: 4 },
    { name: "Nachos Supreme", description: "Totopos con queso fundido, guacamole y pico de gallo", price: 9.99, groupIdx: 4 },
    { name: "Calamares Fritos", description: "Aros de calamar empanizados con salsa tartara", price: 8.99, groupIdx: 4 },

    { name: "Ensalada Cesar", description: "Lechuga romana, crutones, parmesano, aderezo cesar", price: 8.99, groupIdx: 5 },
    { name: "Ensalada Mediterranea", description: "Mix de hojas verdes, aceitunas, tomate cherry, feta", price: 9.99, groupIdx: 5 },
    { name: "Ensalada de Pollo", description: "Pollo a la parrilla, aguacate, maiz, aderezo ranch", price: 10.99, groupIdx: 5 },

    { name: "Spaghetti Bolognese", description: "Pasta larga con salsa bolognesa casera y parmesano", price: 11.99, groupIdx: 6 },
    { name: "Fettuccine Alfredo", description: "Pasta con salsa cremosa de mantequilla y parmesano", price: 12.99, groupIdx: 6 },
    { name: "Lasagna", description: "Capas de pasta, carne, bechamel y queso gratinado", price: 13.99, groupIdx: 6 },

    { name: "Filete Mignon", description: "Corte de res de 250g con pure de papa y vegetales", price: 22.99, groupIdx: 7 },
    { name: "Ribeye", description: "Corte marmoleado de 300g con chimichurri", price: 25.99, groupIdx: 7 },
    { name: "Pollo a la Parrilla", description: "Pechuga de pollo marinada con ensalada fresca", price: 14.99, groupIdx: 7 },

    { name: "Salmon a la Plancha", description: "Filete de salmon con vegetales salteados y arroz", price: 18.99, groupIdx: 8 },
    { name: "Ceviche", description: "Pescado blanco curado en citricos con cebolla morada y cilantro", price: 13.99, groupIdx: 8 },
    { name: "Camarones al Ajillo", description: "Camarones salteados en aceite de oliva, ajo y guindilla", price: 16.99, groupIdx: 8 },

    { name: "California Roll", description: "Cangrejo, aguacate y pepino envuelto en arroz", price: 11.99, groupIdx: 9 },
    { name: "Dragon Roll", description: "Tempura de camaron, aguacate, salsa teriyaki", price: 14.99, groupIdx: 9 },
    { name: "Nigiri Mixto", description: "Seleccion de 6 piezas: salmon, atun y camaron", price: 15.99, groupIdx: 9 },

    { name: "Tacos al Pastor", description: "Cerdo marinado, piña, cebolla y cilantro. 3 piezas", price: 9.99, groupIdx: 10 },
    { name: "Tacos de Bistec", description: "Bistec de res, guacamole y salsa verde. 3 piezas", price: 10.99, groupIdx: 10 },
    { name: "Tacos de Pescado", description: "Pescado empanizado, repollo morado y crema chipotle. 3 piezas", price: 11.99, groupIdx: 10 },

    { name: "Huevos Rancheros", description: "Huevos estrellados sobre tortilla con salsa roja y frijoles", price: 8.99, groupIdx: 11 },
    { name: "Pancakes", description: "Hotcakes esponjosos con miel de maple y fruta fresca", price: 7.99, groupIdx: 11 },
    { name: "Omelette de Vegetales", description: "Omelette relleno de pimientos, champiñones y queso", price: 9.49, groupIdx: 11 },
  ];

  for (const def of productDefs) {
    const groupId = groups[def.groupIdx].id;
    const existing = await prisma.product.findFirst({
      where: { name: def.name, groupId },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: def.name,
          description: def.description,
          price: def.price,
          groupId,
        },
      });
    }
  }

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

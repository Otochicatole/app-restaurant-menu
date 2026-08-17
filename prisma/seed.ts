import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

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
    { name: "Hamburguesa Hawaiana", description: "Carne de res, piña asada, jamon y queso suizo", price: 14.49, groupIdx: 0 },
    { name: "Hamburguesa Tex-Mex", description: "Carne angus, jalapeños, guacamole y salsa chipotle", price: 15.49, groupIdx: 0 },

    { name: "Pizza Margherita", description: "Salsa de tomate, mozzarella, albahaca fresca", price: 10.99, groupIdx: 1 },
    { name: "Pizza Pepperoni", description: "Salsa de tomate, mozzarella, pepperoni", price: 12.99, groupIdx: 1 },
    { name: "Pizza Hawaiana", description: "Salsa de tomate, mozzarella, jamon, piña", price: 13.99, groupIdx: 1 },
    { name: "Pizza Cuatro Quesos", description: "Mozzarella, gorgonzola, parmesano, fontina", price: 14.99, groupIdx: 1 },
    { name: "Pizza Prosciutto", description: "Salsa de tomate, mozzarella, prosciutto crudo y rucula", price: 15.99, groupIdx: 1 },
    { name: "Pizza Diavola", description: "Salsa picante, mozzarella, salami picante y aceitunas", price: 14.49, groupIdx: 1 },

    { name: "Coca-Cola", description: "Lata 355ml", price: 2.99, groupIdx: 2 },
    { name: "Agua Mineral", description: "Botella 500ml", price: 1.99, groupIdx: 2 },
    { name: "Limonada Natural", description: "Jugo de limon fresco, azucar, menta", price: 3.99, groupIdx: 2 },
    { name: "Jugo de Naranja", description: "Naranjas exprimidas al momento, 400ml", price: 4.49, groupIdx: 2 },
    { name: "Cerveza Artesanal", description: "Botella 355ml, IPA o Lager", price: 5.99, groupIdx: 2 },
    { name: "Smoothie Tropical", description: "Mango, maracuya y pina con yogur, 500ml", price: 5.49, groupIdx: 2 },

    { name: "Tiramisu", description: "Postre clasico italiano con mascarpone y cafe", price: 6.99, groupIdx: 3 },
    { name: "Cheesecake", description: "Tarta de queso cremosa con frutos rojos", price: 5.99, groupIdx: 3 },
    { name: "Helado Artesanal", description: "Dos bolas: chocolate, vainilla o fresa", price: 4.99, groupIdx: 3 },
    { name: "Volcan de Chocolate", description: "Pastel de chocolate con corazon fundido y helado de vainilla", price: 7.99, groupIdx: 3 },
    { name: "Creme Brulee", description: "Natilla francesa con costra de caramelo caramelizado", price: 6.49, groupIdx: 3 },
    { name: "Churros con Chocolate", description: "Churros crujientes con salsa de chocolate caliente", price: 5.99, groupIdx: 3 },

    { name: "Bruschetta", description: "Pan tostado con tomate, albahaca y aceite de oliva", price: 7.99, groupIdx: 4 },
    { name: "Nachos Supreme", description: "Totopos con queso fundido, guacamole y pico de gallo", price: 9.99, groupIdx: 4 },
    { name: "Calamares Fritos", description: "Aros de calamar empanizados con salsa tartara", price: 8.99, groupIdx: 4 },
    { name: "Tabla de Quesos", description: "Seleccion de 4 quesos artesanales con frutos secos y mermelada", price: 12.99, groupIdx: 4 },
    { name: "Alitas BBQ", description: "8 alitas de pollo bañadas en salsa BBQ ahumada", price: 10.99, groupIdx: 4 },
    { name: "Empanadas Criollas", description: "3 empanadas de carne cortada a cuchillo con chimichurri", price: 8.49, groupIdx: 4 },

    { name: "Ensalada Cesar", description: "Lechuga romana, crutones, parmesano, aderezo cesar", price: 8.99, groupIdx: 5 },
    { name: "Ensalada Mediterranea", description: "Mix de hojas verdes, aceitunas, tomate cherry, feta", price: 9.99, groupIdx: 5 },
    { name: "Ensalada de Pollo", description: "Pollo a la parrilla, aguacate, maiz, aderezo ranch", price: 10.99, groupIdx: 5 },
    { name: "Ensalada Caprese", description: "Tomate, mozzarella fresca, albahaca y reduccion balsamica", price: 9.49, groupIdx: 5 },
    { name: "Ensalada de Salmon", description: "Salmon ahumado, mix de hojas verdes, aguacate y eneldo", price: 13.99, groupIdx: 5 },
    { name: "Ensalada Griega", description: "Pepino, tomate, cebolla morada, aceitunas kalamata y feta", price: 9.99, groupIdx: 5 },

    { name: "Spaghetti Bolognese", description: "Pasta larga con salsa bolognesa casera y parmesano", price: 11.99, groupIdx: 6 },
    { name: "Fettuccine Alfredo", description: "Pasta con salsa cremosa de mantequilla y parmesano", price: 12.99, groupIdx: 6 },
    { name: "Lasagna", description: "Capas de pasta, carne, bechamel y queso gratinado", price: 13.99, groupIdx: 6 },
    { name: "Penne Arrabiata", description: "Pasta corta con salsa de tomate picante, ajo y albahaca", price: 10.99, groupIdx: 6 },
    { name: "Ravioli de Ricotta", description: "Raviolis rellenos de ricotta y espinaca con salsa de mantequilla y salvia", price: 13.49, groupIdx: 6 },
    { name: "Carbonara", description: "Espagueti con huevo, panceta, pecorino y pimienta negra", price: 12.49, groupIdx: 6 },

    { name: "Filete Mignon", description: "Corte de res de 250g con pure de papa y vegetales", price: 22.99, groupIdx: 7 },
    { name: "Ribeye", description: "Corte marmoleado de 300g con chimichurri", price: 25.99, groupIdx: 7 },
    { name: "Pollo a la Parrilla", description: "Pechuga de pollo marinada con ensalada fresca", price: 14.99, groupIdx: 7 },
    { name: "Tomahawk", description: "Corte de res de 500g con hueso largo, papas rusticas y chimichurri", price: 32.99, groupIdx: 7 },
    { name: "Costillas BBQ", description: "Costillas de cerdo glaseadas en salsa BBQ ahumada con elote asado", price: 18.99, groupIdx: 7 },
    { name: "Churrasco Argentino", description: "Churrasco de res a la parrilla con chimichurri y papas fritas", price: 19.99, groupIdx: 7 },

    { name: "Salmon a la Plancha", description: "Filete de salmon con vegetales salteados y arroz", price: 18.99, groupIdx: 8 },
    { name: "Ceviche", description: "Pescado blanco curado en citricos con cebolla morada y cilantro", price: 13.99, groupIdx: 8 },
    { name: "Camarones al Ajillo", description: "Camarones salteados en aceite de oliva, ajo y guindilla", price: 16.99, groupIdx: 8 },
    { name: "Pulpo a la Parrilla", description: "Tentaculo de pulpo asado con pure de papa y pimenton ahumado", price: 19.99, groupIdx: 8 },
    { name: "Tostadas de Atun", description: "Atun fresco sellado sobre tostada con guacamole y salsa de soya", price: 15.99, groupIdx: 8 },
    { name: "Filete de Robalo", description: "Robalo a la mantequilla con alcaparras, arroz y vegetales", price: 17.99, groupIdx: 8 },

    { name: "California Roll", description: "Cangrejo, aguacate y pepino envuelto en arroz", price: 11.99, groupIdx: 9 },
    { name: "Dragon Roll", description: "Tempura de camaron, aguacate, salsa teriyaki", price: 14.99, groupIdx: 9 },
    { name: "Nigiri Mixto", description: "Seleccion de 6 piezas: salmon, atun y camaron", price: 15.99, groupIdx: 9 },
    { name: "Philadelphia Roll", description: "Salmon ahumado, queso crema y pepino envuelto en arroz", price: 13.49, groupIdx: 9 },
    { name: "Rainbow Roll", description: "California roll cubierto con laminas de salmon, atun y aguacate", price: 16.99, groupIdx: 9 },
    { name: "Tempura Roll", description: "Camaron en tempura, aguacate y pepino con salsa dynamite", price: 14.99, groupIdx: 9 },

    { name: "Tacos al Pastor", description: "Cerdo marinado, piña, cebolla y cilantro. 3 piezas", price: 9.99, groupIdx: 10 },
    { name: "Tacos de Bistec", description: "Bistec de res, guacamole y salsa verde. 3 piezas", price: 10.99, groupIdx: 10 },
    { name: "Tacos de Pescado", description: "Pescado empanizado, repollo morado y crema chipotle. 3 piezas", price: 11.99, groupIdx: 10 },
    { name: "Tacos de Carnitas", description: "Cerdo confitado, cebolla, cilantro y salsa verde. 3 piezas", price: 10.49, groupIdx: 10 },
    { name: "Tacos de Cochinita Pibil", description: "Cerdo marinado en achiote con cebolla morada encurtida. 3 piezas", price: 11.49, groupIdx: 10 },
    { name: "Quesadilla de Birria", description: "Quesadilla dorada con birria de res, consomme y queso fundido", price: 13.49, groupIdx: 10 },

    { name: "Huevos Rancheros", description: "Huevos estrellados sobre tortilla con salsa roja y frijoles", price: 8.99, groupIdx: 11 },
    { name: "Pancakes", description: "Hotcakes esponjosos con miel de maple y fruta fresca", price: 7.99, groupIdx: 11 },
    { name: "Omelette de Vegetales", description: "Omelette relleno de pimientos, champiñones y queso", price: 9.49, groupIdx: 11 },
    { name: "Chilaquiles", description: "Totopos bañados en salsa roja o verde con crema, queso y pollo", price: 9.99, groupIdx: 11 },
    { name: "Waffles con Fruta", description: "Waffle belga con fruta fresca, crema batida y miel de maple", price: 8.99, groupIdx: 11 },
    { name: "Tostadas de Aguacate", description: "Pan artesanal tostado con aguacate, huevo pochado y salmon", price: 11.49, groupIdx: 11 },
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

  const fontDefs = [
    { name: "Playfair Display", category: "serif", source: "google", googleFamily: "Playfair Display", fontFamily: '"Playfair Display", serif', weights: "400;700" },
    { name: "Lora", category: "serif", source: "google", googleFamily: "Lora", fontFamily: '"Lora", serif', weights: "400;700" },
    { name: "Merriweather", category: "serif", source: "google", googleFamily: "Merriweather", fontFamily: '"Merriweather", serif', weights: "400;700" },
    { name: "Cormorant Garamond", category: "serif", source: "google", googleFamily: "Cormorant Garamond", fontFamily: '"Cormorant Garamond", serif', weights: "400;700" },
    { name: "Roboto", category: "sans-serif", source: "google", googleFamily: "Roboto", fontFamily: '"Roboto", sans-serif', weights: "400;700" },
    { name: "Open Sans", category: "sans-serif", source: "google", googleFamily: "Open Sans", fontFamily: '"Open Sans", sans-serif', weights: "400;700" },
    { name: "Montserrat", category: "sans-serif", source: "google", googleFamily: "Montserrat", fontFamily: '"Montserrat", sans-serif', weights: "400;700" },
    { name: "Poppins", category: "sans-serif", source: "google", googleFamily: "Poppins", fontFamily: '"Poppins", sans-serif', weights: "400;700" },
    { name: "Roboto Mono", category: "monospace", source: "google", googleFamily: "Roboto Mono", fontFamily: '"Roboto Mono", monospace', weights: "400;700" },
    { name: "Space Mono", category: "monospace", source: "google", googleFamily: "Space Mono", fontFamily: '"Space Mono", monospace', weights: "400;700" },
    { name: "Oswald", category: "display", source: "google", googleFamily: "Oswald", fontFamily: '"Oswald", sans-serif', weights: "400;700" },
    { name: "Dancing Script", category: "script", source: "google", googleFamily: "Dancing Script", fontFamily: '"Dancing Script", cursive', weights: "400;700" },
    { name: "Lobster", category: "script", source: "google", googleFamily: "Lobster", fontFamily: '"Lobster", cursive', weights: "400" },
    { name: "Pacifico", category: "script", source: "google", googleFamily: "Pacifico", fontFamily: '"Pacifico", cursive', weights: "400" },
    { name: "Bebas Neue", category: "display", source: "google", googleFamily: "Bebas Neue", fontFamily: '"Bebas Neue", sans-serif', weights: "400" },
    { name: "Cinzel", category: "display", source: "google", googleFamily: "Cinzel", fontFamily: '"Cinzel", serif', weights: "400;700" },
    { name: "Abril Fatface", category: "display", source: "google", googleFamily: "Abril Fatface", fontFamily: '"Abril Fatface", serif', weights: "400" },
    { name: "Bangers", category: "display", source: "google", googleFamily: "Bangers", fontFamily: '"Bangers", cursive', weights: "400" },
  ];

  for (const def of fontDefs) {
    await prisma.font.upsert({
      where: { name: def.name },
      update: {
        category: def.category,
        source: def.source,
        googleFamily: def.googleFamily,
        fontFamily: def.fontFamily,
        weights: def.weights,
      },
      create: def,
    });
  }

  const defaultFont = await prisma.font.findUnique({ where: { name: "Playfair Display" } });
  if (defaultFont) {
    await prisma.setting.upsert({
      where: { key: "menu.activeFontId" },
      update: { value: defaultFont.id },
      create: { key: "menu.activeFontId", value: defaultFont.id },
    });
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

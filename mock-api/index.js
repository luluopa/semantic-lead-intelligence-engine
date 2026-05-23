const express = require('express');
const app = express();
const port = 4000;

app.use(express.json());

const industries = ["SaaS", "Fintech", "E-commerce", "Healthtech", "Logistics", "Edtech"];
const legalNatures = ["Sociedade Empresária Limitada", "Empresa Individual de Responsabilidade Limitada", "Sociedade Anônima", "Empresário Individual"];
const streets = ["Rua das Inovações", "Avenida Paulista", "Rua dos Pinheiros", "Avenida Faria Lima", "Rua Haddock Lobo"];
const neighborhoods = ["Centro", "Jardins", "Pinheiros", "Itaim Bibi", "Vila Madalena"];
const cities = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Porto Alegre"];
const states = ["SP", "RJ", "MG", "PR", "RS"];
const firstNames = ["Ana", "Bruno", "Carla", "Diego", "Elena", "Fabio", "Gisele", "Hugo"];
const lastNames = ["Souza", "Oliveira", "Silva", "Santos", "Pereira", "Costa", "Rodrigues", "Almeida"];
const roles = ["Sócia Administradora", "Sócio Cotista", "Diretor Executivo", "Presidente"];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

app.get('/enrich/:cnpj', (req, res) => {
  const { cnpj } = req.params;
  
  // Simula um atraso de rede
  setTimeout(() => {
    // Simula uma falha aleatória (10% de chance) para testar a resiliência
    if (Math.random() < 0.1) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const firstName = getRandom(firstNames);
    const lastName = getRandom(lastNames);
    const companyBase = getRandom(["Tech", "Global", "Smart", "Digital", "Future", "Prime"]);
    const companySuffix = getRandom(["Corp", "Solutions", "Services", "Group", "Hub", "Lab"]);
    const companyName = `${companyBase} ${companySuffix}`;

    res.json({
      companyName: companyName,
      tradeName: `${companyName} ${getRandom(["Brasil", "LTDA", "S.A.", "Sistemas"])}`,
      cnpj: cnpj,
      industry: getRandom(industries),
      legalNature: getRandom(legalNatures),
      employeeCount: getRandomInt(1, 5000),
      annualRevenue: getRandomInt(100000, 100000000),
      foundedAt: `${getRandomInt(1990, 2023)}-${String(getRandomInt(1, 12)).padStart(2, '0')}-${String(getRandomInt(1, 28)).padStart(2, '0')}`,
      address: {
        street: getRandom(streets),
        number: String(getRandomInt(1, 5000)),
        complement: getRandom(["Sala 42", "Andar 10", "Bloco B", "Conjunto 101", ""]),
        neighborhood: getRandom(neighborhoods),
        city: getRandom(cities),
        state: getRandom(states),
        zipCode: `${getRandomInt(10000, 99999)}-${getRandomInt(100, 999)}`,
        country: "BR"
      },
      cnaes: [
        { code: `${getRandomInt(1000, 9999)}-${getRandomInt(1, 9)}/00`, description: "Desenvolvimento de programas de computador sob encomenda", isPrimary: true },
        { code: `${getRandomInt(1000, 9999)}-${getRandomInt(1, 9)}/00`, description: "Consultoria em tecnologia da informação", isPrimary: false }
      ],
      partners: [
        {
          name: `${firstName} ${lastName}`,
          cpf: `***.${getRandomInt(100, 999)}.${getRandomInt(100, 999)}-**`,
          role: getRandom(roles),
          joinedAt: "2015-03-10",
          phone: `+55 ${getRandomInt(11, 99)} 9${getRandomInt(7000, 9999)}-${getRandomInt(1000, 9999)}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyName.toLowerCase().replace(/\s/g, '')}.com`
        }
      ],
      phones: [
        { type: "commercial", number: `+55 ${getRandomInt(11, 99)} 3${getRandomInt(0, 999)}-${getRandomInt(1000, 9999)}` }
      ],
      emails: [
        { type: "commercial", address: `contato@${companyName.toLowerCase().replace(/\s/g, '')}.com` }
      ]
    });
  }, 500);
});

app.listen(port, () => {
  console.log(`Mock API running at http://localhost:${port}`);
});
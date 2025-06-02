export interface PetData {
  ownerEmail: string;      // ties to ownerUsers.ts → email
  name: string;
  species: string;
  breed: string;
  birthDate: string;       // ISO string (yyyy‐mm‐dd)
}

export const pets: PetData[] = [
  {
    ownerEmail: 'alice@owner.fi',
    name: 'Luna',
    species: 'Dog',
    breed: 'Labrador',
    birthDate: '2021-04-01'
  },
  {
    ownerEmail: 'alice@owner.fi',
    name: 'Milo',
    species: 'Cat',
    breed: 'Siamese',
    birthDate: '2020-07-15'
  },
  {
    ownerEmail: 'bob@owner.fi',
    name: 'Bella',
    species: 'Dog',
    breed: 'Beagle',
    birthDate: '2019-10-10'
  },
  {
    ownerEmail: 'carol@owner.fi',
    name: 'Max',
    species: 'Dog',
    breed: 'Golden Retriever',
    birthDate: '2022-01-20'
  }
];
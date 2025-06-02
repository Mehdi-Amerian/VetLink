export interface OwnerUserData {
  email: string;
  password: string;
  fullName: string;
}

export const ownerUsers: OwnerUserData[] = [
  { email: 'alice@owner.fi',  password: 'OwnerPass1!', fullName: 'Alice Aalto' },
  { email: 'bob@owner.fi',    password: 'OwnerPass1!', fullName: 'Bob Berg' },
  { email: 'carol@owner.fi',  password: 'OwnerPass1!', fullName: 'Carol Carlsson' }
];
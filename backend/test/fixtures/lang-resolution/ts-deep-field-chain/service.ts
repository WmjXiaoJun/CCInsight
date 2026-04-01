import { User } from './models';

function processUser(user: User) {
  // 2-level chain: user.address â†?Address, then .save() â†?Address#save
  user.address.save();

  // 3-level chain: user.address â†?Address, .city â†?City, .getName() â†?City#getName
  user.address.city.getName();
}

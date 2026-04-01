import { User, UserService } from './models';

function processWithService(svc: UserService) {
  // call â†?field â†?call: svc.getUser().address.save()
  svc.getUser().address.save();
}

function processWithUser(user: User) {
  // field â†?call â†?call: user.getAddress().city.getName()
  user.getAddress().city.getName();
}

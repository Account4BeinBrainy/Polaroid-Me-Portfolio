import { navigateWithIris, revealArrival } from './portfolio-navigation.js?v=mobile-history-20261001-1';
import { showIrisFailure } from './page-transition.js?v=navigation-20261001-1';

document.querySelector('.portfolio-back').addEventListener('click', event => {
  event.preventDefault();
  navigateWithIris('/?page=boxes');
});

revealArrival().catch(error => showIrisFailure(error));

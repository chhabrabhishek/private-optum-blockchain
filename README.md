# Private Optum Blockchain (POB)
## Steps to access the application
* Clone the `https://github.optum.com/achhabr9/blockchain` repository or download the code
* Navigate to blockchain folder inside project structure using cmd line.
* Install the npm dependencies using `npm install` command.
* After the dependencies are installed you have to start the server on multiple ports.
  * To start the server on a specific port type `npm run node_1` command.
  * You can start the app on multiple ports by using `npm run node_2`, `npm run node_3` etc.
  * Each port will signify a different node inside the network.
* Access the application inside any modern browser (**avoid IE**) using `http://localhost:port/block-explorer` address.
* The blockchain is ready and up, use broadcast new node button to add nodes to the network.
* While broadcasting new node, it will ask you for a password as it is private blockchain simulation. The password is `**optum**`.

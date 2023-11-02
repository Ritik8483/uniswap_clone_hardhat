import "./App.css";
import Home from "./frontend/components/Home";

function App() {
  return (
    <div className="App">
      <Home />
    </div>
  );
}

export default App;


//install openzeplin  v4.5.0
//npx hardhat run src/backend/scripts/deploy.js --network localhost
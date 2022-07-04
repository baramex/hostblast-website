import Dropdown from "./Dropdown";

function Header() {
    return (
        <header className="bg-pink w-100 p-4 d-flex align-items-center">
            <h1 className="me-5">HostBlast</h1>
            <Dropdown href="#" name="Hébergement">
                <item href="/hosting/vps">VPS</item>
                <item href="/hosting/discord">Discord.js</item>
                <item href="/hosting/minecraft">Minecraft</item>
            </Dropdown>
            <Dropdown href="#" name="Stockage">
                <item href="/storage/clouds">Cloud</item>
            </Dropdown>
            <Dropdown href="#" name="Web">
                <item href="/web/domain">Domaine</item>
            </Dropdown>
            <button className="btn btn-outline-primary ms-auto">Se connecter</button>
        </header>
    );
}

export default Header;
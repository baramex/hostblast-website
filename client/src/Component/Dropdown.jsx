function Dropdown({ name, href, children }) {
    return (
        <div className="btn-group mx-4">
            <a className="dropdown-toggle" href={href} data-bs-toggle="dropdown" aria-expanded="false">
                {name}
            </a>
            <ul className="dropdown-menu" aria-labelledby={name}>
                {(Array.isArray(children) ? children : [children]).map((a, i) => (<li key={i}><a className="dropdown-item" href={a.props.href}>{a.props.children}</a></li>))}
            </ul>
        </div>
    );
}

export default Dropdown;
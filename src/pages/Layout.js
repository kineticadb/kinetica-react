import { Outlet } from "react-router-dom";
import {
    Dropdown,
    DropdownButton,
} from 'react-bootstrap';
import { useLocation } from 'react-router-dom';

const Layout = () => {
    const { pathname } = useLocation();
    const locationMapping = {
        '/exampleWms': 'WMS with info popup',
        '/exampleWmsClassbreak': 'Classbreak WMS',
        '/exampleWmsSpatialFilter': 'Spatial Filter on Table',
        '/exampleVts': 'Vector Tiles',
        '/exampleApp': 'Example App',
    };
    const title = locationMapping[pathname] || 'Select Example';

    const dropItems = Object.keys(locationMapping).map(locationKey => {
        return (<Dropdown.Item href={locationKey}>{locationMapping[locationKey]}</Dropdown.Item>);
    });

    return (
        <>
            <div>
                <div style={{ display: "inline-block", paddingLeft: "10px", paddingRight: "15px", fontWeight: "bold", marginBottom: '20px' }}>Select Example: </div>
                <div style={{ display: "inline-block" }}>
                    <DropdownButton id="dropdown-basic-button" title={title}>
                        {dropItems}
                    </DropdownButton>
                </div>
            </div>
            <div style={{ width: "100%", height: "900px" }}>
                <Outlet />
            </div>
        </>
    )
};

export default Layout;
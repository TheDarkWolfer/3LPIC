

function Image({icon, size}) {
    return <img src={"/src/assets/" + icon} width={size} />;
}

export default Image;
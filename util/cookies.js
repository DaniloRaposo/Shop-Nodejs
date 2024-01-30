const getLoggedIn = (cookies) => {
  const regex = new RegExp(/loggedIn=\w+/);
  const match = cookies.match(regex);

  if (match?.length > 0) {
    return match[0].replace("loggedIn=", "") === "true";
  }

  return false;
};

exports.getLoggedIn = getLoggedIn;

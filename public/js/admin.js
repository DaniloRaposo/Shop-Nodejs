const deleteProduct = (button) => {
  const buttonParent = button.parentNode;

  const prodId = buttonParent.querySelector("[name=productId]").value;
  const csrfToken = buttonParent.querySelector("[name=_csrf]").value;
  const productElement = button.closest("article");

  fetch(`/admin/product/${prodId}`, {
    method: "DELETE",
    headers: {
      "csrf-token": csrfToken,
    },
  })
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      console.log(data);
      productElement.parentNode.removeChild(productElement);
    })
    .catch((err) => {
      console.log(err);
    });
};

module.exports = deleteProduct;

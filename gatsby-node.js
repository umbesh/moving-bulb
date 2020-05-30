const path = require(`path`)
const { createFilePath } = require(`gatsby-source-filesystem`)

const formatTitleForUrl = (title) =>
  title
    .trim()
    .split(" ")
    .join("-")
    .split("'")
    .join("")
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    )
const redirects = [
  {
    from: "/articles/Sharing-Presentations-Without-Sharing-My-Screen",
    to: "/articles/Presenting-Without-Sharing-My-Screen",
  },
]

exports.createPages = async ({ actions, graphql, reporter }) => {
  const { createPage, createRedirect } = actions
  redirects.forEach((redirect) => {
    createRedirect({
      fromPath: redirect.from,
      toPath: redirect.to,
      isPermanent: true,
    })
    createRedirect({
      fromPath: redirect.from + "/",
      toPath: redirect.to + "/",
      isPermanent: true,
    })
  })

  actions.createPage({
    path: "/articles",
    component: require.resolve("./src/templates/Articles.js"),
  })

  actions.createPage({
    path: "/projects",
    component: require.resolve("./src/templates/Projects.js"),
  })

  actions.createPage({
    path: "/runs",
    component: require.resolve("./src/templates/Runs.js"),
  })
  actions.createPage({
    path: "/runs/posters",
    component: require.resolve("./src/templates/RunPosters.js"),
  })

  const QandA = path.resolve(`./src/templates/QandA.js`)
  const Article = path.resolve(`./src/templates/Article.js`)
  const MDXArticle = path.resolve(`./src/templates/MDXArticle.js`)
  const Project = path.resolve(`./src/templates/Project.js`)
  const result = await graphql(`
    {
      allMarkdownRemark(
        limit: 1000
        filter: { frontmatter: { type: { in: ["Project", "Q&A"] } } }
      ) {
        edges {
          node {
            frontmatter {
              path
              type
              title
            }
          }
        }
      }
    }
  `)
  // Handle errors
  if (result.errors) {
    reporter.panicOnBuild(`Error while running GraphQL query.`)
    return
  }
  result.data.allMarkdownRemark.edges.forEach(({ node }) => {
    switch (node.frontmatter.type) {
      case "Q&A":
        createPage({
          path: node.frontmatter.path,
          component: QandA,
        })
        break
      case "Project":
        createPage({
          path: node.frontmatter.path,
          component: Project,
        })
        break
      default:
        console.log(`Unknown page: ${node.frontmatter.type}`)
    }
  })
  const mediumPosts = await graphql(`
    {
      allFeedMediumBlog(sort: { fields: isoDate, order: DESC }) {
        nodes {
          title
          pubDate
          isoDate
          content {
            encoded
          }
          link
        }
      }
    }
  `)

  if (mediumPosts.errors) {
    reporter.panicOnBuild(`Error while running GraphQL query.`)
    return
  }
  mediumPosts.data.allFeedMediumBlog.nodes.forEach((node) => {
    const slug = "articles/" + node.title.trim().split(" ").join("-")
    if (node.content.encoded) {
      createPage({
        path: slug,
        component: Article,
        context: { slug: slug },
      })
    } else {
    }
  })

  const mdxPosts = await graphql(`
    {
      allMdx(filter: { frontmatter: { type: { eq: "Article" } } }) {
        edges {
          node {
            id
            frontmatter {
              title
            }
          }
        }
      }
    }
  `)
  if (mdxPosts.errors) {
    reporter.panicOnBuild(`Error while running GraphQL query.`)
    return
  }

  mdxPosts.data.allMdx.edges.forEach((item) => {
    const slug = "articles/" + formatTitleForUrl(item.node.frontmatter.title)
    createPage({
      path: slug,
      component: MDXArticle,
      context: { slug: slug },
    })
  })
}

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField, deleteNode, createRedirect } = actions

  if (node.internal.type === `MarkdownRemark`) {
    const value = createFilePath({ node, getNode })
    createNodeField({
      name: `slug`,
      node,
      value,
    })
  }
  if (node.internal.type === "Mdx" && node.frontmatter.type === "Article") {
    createNodeField({
      node,
      name: `slug`,
      value: "articles/" + formatTitleForUrl(node.frontmatter.title),
    })
    if (node.frontmatter.path) {
      createRedirect({
        fromPath: node.frontmatter.path,
        toPath: "articles/" + formatTitleForUrl(node.frontmatter.title),
        isPermanent: true,
      })
    }
  }
  if (node.internal.type === `FeedMediumBlog`) {
    const firstImage = node.content.encoded.match(/src\s*=\s*"(.+?)"/)[1]
    createNodeField({
      node,
      name: `slug`,
      value: "articles/" + node.title.trim().split(" ").join("-"),
    })
    createNodeField({
      node,
      name: "excerpt",
      value:
        node.content.encoded
          .replace(/<\/[^>]*>?/gm, " ")
          .replace(/<[^>]*>?/gm, "")
          .substring(0, 250) + "...",
    })
    createNodeField({
      node,
      name: "hero-img",
      value: firstImage,
    })
    createNodeField({
      node,
      name: "placeholder-img",
      value: firstImage.replace(/\/max\/\d*/, "/max/350"),
    })
  }
}

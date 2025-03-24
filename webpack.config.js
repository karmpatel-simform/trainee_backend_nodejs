import path from 'path';
import nodeExternals from 'webpack-node-externals';

export default {
  entry: './index.js', // Your entry file
  target: 'node',
  externals: [nodeExternals()],
  output: {
    filename: 'bundle.js',
    path: path.resolve('dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            },
        },
      },
    ],
  },
};
